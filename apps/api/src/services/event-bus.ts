/**
 * Canonical Domain Event Bus -- Phase 355
 *
 * Versioned events with outbox pattern, replay, DLQ, tenant isolation.
 * All domain events flow through this bus. Webhooks and FHIR subscriptions
 * consume from it. Plugins register as event consumers.
 *
 * PHI safety: subjectRefHash is SHA-256 of the subject identifier.
 * Raw PHI never appears in event payloads.
 */

import { randomUUID, createHash } from "node:crypto";
import { log } from "../lib/logger.js";

// ─── Event Schema ────────────────────────────────────────

export interface DomainEvent {
  eventId: string;
  eventType: string;
  version: number;
  tenantId: string;
  /** SHA-256 hash of the subject identifier (e.g., patient DFN) -- NO raw PHI */
  subjectRefHash: string;
  occurredAt: string;
  /** Sanitized payload -- never contains raw PHI */
  payload: Record<string, unknown>;
  /** Source system that produced the event */
  source: string;
  /** Correlation ID for tracing across services */
  correlationId?: string;
}

export interface EventConsumer {
  id: string;
  name: string;
  /** Event type patterns to subscribe to (supports '*' wildcard) */
  eventFilters: string[];
  /** Handler function -- must not throw; errors go to DLQ */
  handler: (event: DomainEvent) => Promise<void>;
  /** Optional tenant filter -- empty means all tenants */
  tenantIds?: string[];
}

export interface DlqEntry {
  id: string;
  event: DomainEvent;
  consumerId: string;
  error: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
}

// ─── Event Type Registry ─────────────────────────────────

export const EVENT_TYPES = {
  TENANT_CREATED:     "tenant.created.v1",
  NOTE_SIGNED:        "note.signed.v1",
  ORDER_PLACED:       "order.placed.v1",
  LAB_RESULT_POSTED:  "lab.result.posted.v1",
  CLAIM_SUBMITTED:    "claim.submitted.v1",
  PATIENT_UPDATED:    "patient.updated.v1",
  ALLERGY_ADDED:      "allergy.added.v1",
  APPOINTMENT_BOOKED: "appointment.booked.v1",
  MEDICATION_ORDERED: "medication.ordered.v1",
  OBSERVATION_CREATED: "observation.created.v1",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// ─── Stores ──────────────────────────────────────────────

/** Outbox: persists published events for replay */
const outbox: DomainEvent[] = [];

/** Dead Letter Queue: failed deliveries */
const dlq: DlqEntry[] = [];

/** Registered consumers */
const consumers: Map<string, EventConsumer> = new Map();

/** Event delivery log (for auditing) */
const deliveryLog: Array<{
  eventId: string;
  consumerId: string;
  deliveredAt: string;
  success: boolean;
  error?: string;
}> = [];

// ─── Configuration ───────────────────────────────────────

const MAX_OUTBOX_SIZE = 10_000;
const MAX_DLQ_SIZE = 5_000;
const MAX_DELIVERY_LOG = 10_000;
const DEFAULT_MAX_RETRIES = 3;

// ─── PG Write-Through (W41-P3) ──────────────────────────

interface EventBusRepo {
  upsert(data: any): Promise<any>;
  findByTenant(tenantId: string, opts?: { limit?: number }): Promise<any[]>;
}

let _outboxRepo: EventBusRepo | null = null;
let _dlqRepo: EventBusRepo | null = null;
let _deliveryLogRepo: EventBusRepo | null = null;

/**
 * Wire PG repos for event bus persistence.
 * Called from lifecycle.ts during PG init.
 */
export function initEventBusRepos(repos: {
  outbox: EventBusRepo;
  dlq: EventBusRepo;
  deliveryLog: EventBusRepo;
}): void {
  _outboxRepo = repos.outbox;
  _dlqRepo = repos.dlq;
  _deliveryLogRepo = repos.deliveryLog;
  log.info("Event bus stores wired to PG (W41-P3)");
}

/**
 * Rehydrate outbox + DLQ from PG on startup.
 * Only loads last N entries to prevent memory bloat.
 */
export async function rehydrateEventBus(tenantId: string): Promise<void> {
  if (!_outboxRepo) return;
  try {
    const pgOutbox = await _outboxRepo.findByTenant(tenantId, { limit: MAX_OUTBOX_SIZE });
    for (const row of pgOutbox) {
      if (!outbox.find((e) => e.eventId === row.eventId || e.eventId === row.id)) {
        outbox.push(row as DomainEvent);
      }
    }
  } catch (e) { log.warn("Event bus outbox rehydration failed", { error: String(e) }); }

  if (!_dlqRepo) return;
  try {
    const pgDlq = await _dlqRepo.findByTenant(tenantId, { limit: MAX_DLQ_SIZE });
    for (const row of pgDlq) {
      if (!dlq.find((d) => d.id === row.id)) {
        dlq.push(row as DlqEntry);
      }
    }
  } catch (e) { log.warn("Event bus DLQ rehydration failed", { error: String(e) }); }
}

function persistOutboxEvent(event: DomainEvent): void {
  if (!_outboxRepo) return;
  void _outboxRepo.upsert({
    id: event.eventId,
    tenantId: event.tenantId,
    eventType: event.eventType,
    version: event.version,
    subjectRefHash: event.subjectRefHash,
    occurredAt: event.occurredAt,
    payload: JSON.stringify(event.payload),
    source: event.source,
    correlationId: event.correlationId || null,
  }).catch((e: unknown) => log.warn("Event bus outbox persist failed", { error: String(e) }));
}

function persistDlqEntry(entry: DlqEntry): void {
  if (!_dlqRepo) return;
  void _dlqRepo.upsert({
    id: entry.id,
    tenantId: entry.event.tenantId,
    eventId: entry.event.eventId,
    eventType: entry.event.eventType,
    consumerId: entry.consumerId,
    error: entry.error,
    failedAt: entry.failedAt,
    retryCount: entry.retryCount,
    maxRetries: entry.maxRetries,
    eventPayload: JSON.stringify(entry.event),
  }).catch((e: unknown) => log.warn("Event bus DLQ persist failed", { error: String(e) }));
}

function persistDeliveryLog(entry: { eventId: string; consumerId: string; deliveredAt: string; success: boolean; error?: string }): void {
  if (!_deliveryLogRepo) return;
  void _deliveryLogRepo.upsert({
    id: `${entry.eventId}-${entry.consumerId}-${Date.now()}`,
    tenantId: "default",
    eventId: entry.eventId,
    consumerId: entry.consumerId,
    deliveredAt: entry.deliveredAt,
    success: entry.success,
    error: entry.error || null,
  }).catch((e: unknown) => log.warn("Event bus delivery log persist failed", { error: String(e) }));
}

// ─── Helpers ─────────────────────────────────────────────

/** Hash a subject identifier for PHI safety */
export function hashSubjectRef(ref: string): string {
  return createHash("sha256").update(ref).digest("hex").slice(0, 16);
}

/** Check if an event type matches a filter pattern (supports '*' wildcard) */
function matchesFilter(eventType: string, filter: string): boolean {
  if (filter === "*") return true;
  if (filter.endsWith(".*")) {
    const prefix = filter.slice(0, -2);
    return eventType.startsWith(prefix + ".");
  }
  return eventType === filter;
}

// ─── Publisher ───────────────────────────────────────────

/**
 * Publish a domain event to the bus.
 * Event is added to the outbox and dispatched to all matching consumers.
 */
export async function publishEvent(event: Omit<DomainEvent, "eventId" | "occurredAt">): Promise<DomainEvent> {
  const full: DomainEvent = {
    ...event,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
  };

  // Add to outbox (FIFO eviction if full)
  outbox.push(full);
  if (outbox.length > MAX_OUTBOX_SIZE) {
    outbox.splice(0, outbox.length - MAX_OUTBOX_SIZE);
  }
  persistOutboxEvent(full);

  // Dispatch to consumers
  await dispatchEvent(full);

  return full;
}

/**
 * Dispatch an event to all matching consumers.
 * Failures are caught and routed to DLQ.
 */
async function dispatchEvent(event: DomainEvent): Promise<void> {
  for (const consumer of consumers.values()) {
    // Tenant isolation check
    if (consumer.tenantIds && consumer.tenantIds.length > 0) {
      if (!consumer.tenantIds.includes(event.tenantId)) continue;
    }

    // Event filter check
    const matches = consumer.eventFilters.some((f) => matchesFilter(event.eventType, f));
    if (!matches) continue;

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Consumer timeout (5s)")), 5000);
        consumer.handler(event).then(
          () => { clearTimeout(timer); resolve(); },
          (err) => { clearTimeout(timer); reject(err); },
        );
      });
      const successEntry = {
        eventId: event.eventId,
        consumerId: consumer.id,
        deliveredAt: new Date().toISOString(),
        success: true,
      };
      deliveryLog.push(successEntry);
      persistDeliveryLog(successEntry);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const failEntry = {
        eventId: event.eventId,
        consumerId: consumer.id,
        deliveredAt: new Date().toISOString(),
        success: false,
        error: errorMsg,
      };
      deliveryLog.push(failEntry);
      persistDeliveryLog(failEntry);
      // Route to DLQ
      addToDlq(event, consumer.id, errorMsg);
    }

    // Trim delivery log
    if (deliveryLog.length > MAX_DELIVERY_LOG) {
      deliveryLog.splice(0, deliveryLog.length - MAX_DELIVERY_LOG);
    }
  }
}

// ─── DLQ ─────────────────────────────────────────────────

function addToDlq(event: DomainEvent, consumerId: string, error: string): void {
  const entry: DlqEntry = {
    id: randomUUID(),
    event,
    consumerId,
    error,
    failedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: DEFAULT_MAX_RETRIES,
  };
  dlq.push(entry);
  persistDlqEntry(entry);
  if (dlq.length > MAX_DLQ_SIZE) {
    dlq.splice(0, dlq.length - MAX_DLQ_SIZE);
  }
}

/**
 * Retry a DLQ entry. If consumer exists and retry succeeds, entry is removed.
 * Returns success status.
 */
export async function retryDlqEntry(dlqId: string): Promise<{ ok: boolean; error?: string }> {
  const idx = dlq.findIndex((d) => d.id === dlqId);
  if (idx === -1) return { ok: false, error: "DLQ entry not found" };

  const entry = dlq[idx];
  if (entry.retryCount >= entry.maxRetries) {
    return { ok: false, error: "Max retries exceeded" };
  }

  const consumer = consumers.get(entry.consumerId);
  if (!consumer) {
    return { ok: false, error: "Consumer no longer registered" };
  }

  try {
    await consumer.handler(entry.event);
    dlq.splice(idx, 1); // Remove on success
    return { ok: true };
  } catch (err) {
    entry.retryCount++;
    entry.error = err instanceof Error ? err.message : String(err);
    entry.failedAt = new Date().toISOString();
    return { ok: false, error: entry.error };
  }
}

// ─── Consumer Management ─────────────────────────────────

/** Register an event consumer */
export function registerConsumer(consumer: EventConsumer): void {
  consumers.set(consumer.id, consumer);
}

/** Unregister an event consumer */
export function unregisterConsumer(consumerId: string): boolean {
  return consumers.delete(consumerId);
}

/** List registered consumers */
export function listConsumers(): Omit<EventConsumer, "handler">[] {
  return Array.from(consumers.values()).map(({ handler, ...rest }) => rest);
}

// ─── Replay ──────────────────────────────────────────────

/**
 * Replay events from the outbox within a time window.
 * Only replays to the specified consumer (or all if not specified).
 */
export async function replayEvents(opts: {
  tenantId: string;
  fromTime?: string;
  toTime?: string;
  eventType?: string;
  consumerId?: string;
}): Promise<{ replayed: number; errors: number }> {
  const from = opts.fromTime ? new Date(opts.fromTime).getTime() : 0;
  const to = opts.toTime ? new Date(opts.toTime).getTime() : Date.now();

  const filtered = outbox.filter((e) => {
    if (e.tenantId !== opts.tenantId) return false;
    const ts = new Date(e.occurredAt).getTime();
    if (ts < from || ts > to) return false;
    if (opts.eventType && !matchesFilter(e.eventType, opts.eventType)) return false;
    return true;
  });

  let replayed = 0;
  let errors = 0;

  for (const event of filtered) {
    for (const consumer of consumers.values()) {
      if (opts.consumerId && consumer.id !== opts.consumerId) continue;
      if (consumer.tenantIds?.length && !consumer.tenantIds.includes(event.tenantId)) continue;

      const matches = consumer.eventFilters.some((f) => matchesFilter(event.eventType, f));
      if (!matches) continue;

      try {
        await consumer.handler(event);
        replayed++;
      } catch {
        errors++;
      }
    }
  }

  return { replayed, errors };
}

// ─── Query ───────────────────────────────────────────────

/** Get outbox events, optionally filtered */
export function getOutbox(opts?: {
  tenantId?: string;
  eventType?: string;
  limit?: number;
}): DomainEvent[] {
  let result = [...outbox];
  if (opts?.tenantId) result = result.filter((e) => e.tenantId === opts.tenantId);
  if (opts?.eventType) result = result.filter((e) => matchesFilter(e.eventType, opts.eventType!));
  result = result.reverse(); // Most recent first
  if (opts?.limit) result = result.slice(0, opts.limit);
  return result;
}

/** Get DLQ entries */
export function getDlq(opts?: {
  tenantId?: string;
  consumerId?: string;
  limit?: number;
}): DlqEntry[] {
  let result = [...dlq];
  if (opts?.tenantId) result = result.filter((d) => d.event.tenantId === opts.tenantId);
  if (opts?.consumerId) result = result.filter((d) => d.consumerId === opts.consumerId);
  result = result.reverse();
  if (opts?.limit) result = result.slice(0, opts.limit);
  return result;
}

/** Get delivery log */
export function getDeliveryLog(limit?: number): typeof deliveryLog {
  const result = [...deliveryLog].reverse();
  return limit ? result.slice(0, limit) : result;
}

/** Get event bus stats */
export function getEventBusStats(): {
  outboxSize: number;
  dlqSize: number;
  consumerCount: number;
  deliveryLogSize: number;
  eventTypes: string[];
} {
  return {
    outboxSize: outbox.length,
    dlqSize: dlq.length,
    consumerCount: consumers.size,
    deliveryLogSize: deliveryLog.length,
    eventTypes: Object.values(EVENT_TYPES),
  };
}

// ─── Reset (testing) ─────────────────────────────────────

export function _resetEventBus(): void {
  outbox.length = 0;
  dlq.length = 0;
  consumers.clear();
  deliveryLog.length = 0;
}
