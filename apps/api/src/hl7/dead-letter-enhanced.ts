/**
 * HL7v2 Dead-Letter Queue Enhancement — Phase 259 (Wave 8 P3)
 *
 * Extends the existing DeadLetterEntry with raw message storage + replay.
 * The existing registry.ts DLQ stores only metadata. This module adds:
 * 1. Raw message vault (encrypted at rest in production)
 * 2. Replay/retry mechanism
 * 3. Individual DLQ entry management
 *
 * Pattern: Wraps existing registry.ts DLQ, adds raw message side-store.
 */
import { createHash, randomBytes } from "crypto";
import { recordMessageEvent } from "./message-event-store.js";
import { log } from "../lib/logger.js";

/* ── Types ─────────────────────────────────────────────── */

export interface EnhancedDeadLetterEntry {
  id: string;
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivedAt: number;
  reason: string;
  retryCount: number;
  /** SHA-256 hash of the raw message */
  messageHash: string;
  /** Size in bytes */
  messageSizeBytes: number;
  /** Last retry timestamp (if retried) */
  lastRetryAt: number | null;
  /** Tenant ID resolved from endpoint config */
  tenantId: string;
  /** Whether the entry has been manually resolved */
  resolved: boolean;
  resolvedAt: number | null;
  resolvedBy: string | null;
}

export interface ReplayResult {
  ok: boolean;
  entryId: string;
  action: "replayed" | "not_found" | "already_resolved" | "no_raw_message";
  detail: string;
}

/* ── Raw Message Vault ─────────────────────────────────── */

/**
 * Stores raw HL7 messages keyed by DLQ entry ID.
 * In production, these would be encrypted at rest.
 * Max 1000 entries (matches existing DLQ limit).
 */
const rawMessageVault = new Map<string, string>();
const MAX_VAULT_SIZE = 1000;

function vaultEvict(): void {
  if (rawMessageVault.size > MAX_VAULT_SIZE) {
    const oldest = rawMessageVault.keys().next().value;
    if (oldest) rawMessageVault.delete(oldest);
  }
}

/* ── Enhanced DLQ Store ────────────────────────────────── */

const enhancedDlq: EnhancedDeadLetterEntry[] = [];
const MAX_DLQ_SIZE = 1000;

/* ── PG Write-Through (W41-P5) ─────────────────────────── */

interface Hl7DlqRepo {
  upsert(data: any): Promise<any>;
  findByTenant(tenantId: string, opts?: { limit?: number }): Promise<any[]>;
  update(id: string, updates: any): Promise<any>;
}

let _dlqRepo: Hl7DlqRepo | null = null;

/**
 * Wire PG repo for HL7 dead-letter persistence.
 * Called from lifecycle.ts during PG init.
 */
export function initHl7DlqRepo(repo: Hl7DlqRepo): void {
  _dlqRepo = repo;
  log.info("HL7 dead-letter store wired to PG (W41-P5)");
}

/**
 * Rehydrate DLQ + raw vault from PG on startup.
 */
export async function rehydrateHl7Dlq(tenantId: string): Promise<void> {
  if (!_dlqRepo) return;
  try {
    const rows = await _dlqRepo.findByTenant(tenantId, { limit: MAX_DLQ_SIZE });
    for (const row of rows) {
      if (!enhancedDlq.find((e) => e.id === row.id)) {
        enhancedDlq.push(row as EnhancedDeadLetterEntry);
        // raw_message column is stored in PG; restore to vault
        if (row.rawMessage) rawMessageVault.set(row.id, row.rawMessage);
      }
    }
    log.info("HL7 DLQ rehydrated from PG", { count: rows.length });
  } catch (e) { log.warn("HL7 DLQ rehydration failed", { error: String(e) }); }
}

function persistDlqEntry(entry: EnhancedDeadLetterEntry, rawMessage?: string): void {
  if (!_dlqRepo) return;
  void _dlqRepo.upsert({
    id: entry.id,
    tenantId: entry.tenantId,
    messageType: entry.messageType,
    messageControlId: entry.messageControlId,
    sendingApplication: entry.sendingApplication,
    sendingFacility: entry.sendingFacility,
    receivedAt: new Date(entry.receivedAt).toISOString(),
    reason: entry.reason,
    retryCount: entry.retryCount,
    messageHash: entry.messageHash,
    messageSizeBytes: entry.messageSizeBytes,
    lastRetryAt: entry.lastRetryAt ? new Date(entry.lastRetryAt).toISOString() : null,
    resolved: entry.resolved,
    resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt).toISOString() : null,
    resolvedBy: entry.resolvedBy,
    rawMessage: rawMessage || null,
    createdAt: new Date(entry.receivedAt).toISOString(),
  }).catch((e: unknown) => log.warn("HL7 DLQ persist failed", { error: String(e) }));
}

/**
 * Add a message to the enhanced dead-letter queue.
 * Called from the routing dispatcher when a message cannot be routed.
 */
export function addEnhancedDeadLetter(opts: {
  messageType: string;
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  reason: string;
  rawMessage: string;
  tenantId: string;
}): EnhancedDeadLetterEntry {
  const id = `dlq-${randomBytes(8).toString("hex")}`;
  const now = Date.now();
  const msgHash = createHash("sha256").update(opts.rawMessage).digest("hex");
  const msgSize = Buffer.byteLength(opts.rawMessage, "utf-8");

  const entry: EnhancedDeadLetterEntry = {
    id,
    messageType: opts.messageType,
    messageControlId: opts.messageControlId,
    sendingApplication: opts.sendingApplication,
    sendingFacility: opts.sendingFacility,
    receivedAt: now,
    reason: opts.reason,
    retryCount: 0,
    messageHash: msgHash,
    messageSizeBytes: msgSize,
    lastRetryAt: null,
    tenantId: opts.tenantId,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
  };

  // Store raw message in vault
  rawMessageVault.set(id, opts.rawMessage);
  vaultEvict();

  // FIFO eviction on DLQ
  enhancedDlq.push(entry);
  persistDlqEntry(entry, opts.rawMessage);
  if (enhancedDlq.length > MAX_DLQ_SIZE) {
    const evicted = enhancedDlq.shift();
    if (evicted) rawMessageVault.delete(evicted.id);
  }

  // Record in message event store
  recordMessageEvent({
    tenantId: opts.tenantId,
    direction: "inbound",
    messageType: opts.messageType,
    messageControlId: opts.messageControlId,
    sendingApplication: opts.sendingApplication,
    sendingFacility: opts.sendingFacility,
    receivingApplication: "",
    receivingFacility: "",
    status: "dead_lettered",
    rawMessage: opts.rawMessage,
    errorDetail: opts.reason,
  });

  return entry;
}

/**
 * List DLQ entries with optional filters.
 */
export function listEnhancedDeadLetters(opts?: {
  tenantId?: string;
  resolved?: boolean;
  limit?: number;
}): { entries: EnhancedDeadLetterEntry[]; total: number } {
  let filtered = [...enhancedDlq];

  if (opts?.tenantId) {
    filtered = filtered.filter((e) => e.tenantId === opts.tenantId);
  }
  if (opts?.resolved !== undefined) {
    filtered = filtered.filter((e) => e.resolved === opts.resolved);
  }

  const total = filtered.length;
  const limit = opts?.limit ?? 50;
  return {
    entries: filtered.slice(-limit).reverse(),
    total,
  };
}

/**
 * Get a single DLQ entry by ID.
 */
export function getEnhancedDeadLetter(id: string): EnhancedDeadLetterEntry | undefined {
  return enhancedDlq.find((e) => e.id === id);
}

/**
 * Attempt to replay a dead-lettered message.
 * Returns the raw message for the caller to re-inject into the routing pipeline.
 */
export function replayDeadLetter(
  id: string,
  actorId: string
): ReplayResult & { rawMessage?: string } {
  const entry = enhancedDlq.find((e) => e.id === id);
  if (!entry) {
    return { ok: false, entryId: id, action: "not_found", detail: "DLQ entry not found" };
  }
  if (entry.resolved) {
    return {
      ok: false,
      entryId: id,
      action: "already_resolved",
      detail: `Resolved at ${new Date(entry.resolvedAt!).toISOString()} by ${entry.resolvedBy}`,
    };
  }

  const raw = rawMessageVault.get(id);
  if (!raw) {
    return {
      ok: false,
      entryId: id,
      action: "no_raw_message",
      detail: "Raw message evicted from vault",
    };
  }

  entry.retryCount++;
  entry.lastRetryAt = Date.now();
  persistDlqEntry(entry);

  // Record replay event
  recordMessageEvent({
    tenantId: entry.tenantId,
    direction: "inbound",
    messageType: entry.messageType,
    messageControlId: entry.messageControlId,
    sendingApplication: entry.sendingApplication,
    sendingFacility: entry.sendingFacility,
    receivingApplication: "",
    receivingFacility: "",
    status: "replayed",
    rawMessage: raw,
  });

  return {
    ok: true,
    entryId: id,
    action: "replayed",
    detail: `Retry #${entry.retryCount} by ${actorId}`,
    rawMessage: raw,
  };
}

/**
 * Mark a DLQ entry as manually resolved.
 */
export function resolveDeadLetter(
  id: string,
  actorId: string
): { ok: boolean; detail: string } {
  const entry = enhancedDlq.find((e) => e.id === id);
  if (!entry) {
    return { ok: false, detail: "Not found" };
  }
  entry.resolved = true;
  entry.resolvedAt = Date.now();
  entry.resolvedBy = actorId;
  // Remove raw message from vault
  rawMessageVault.delete(id);
  persistDlqEntry(entry);
  return { ok: true, detail: `Resolved by ${actorId}` };
}

/**
 * Get DLQ stats summary.
 */
export function getDlqStats(): {
  total: number;
  unresolved: number;
  resolved: number;
  vaultSize: number;
  oldestUnresolved: number | null;
} {
  const unresolved = enhancedDlq.filter((e) => !e.resolved);
  return {
    total: enhancedDlq.length,
    unresolved: unresolved.length,
    resolved: enhancedDlq.length - unresolved.length,
    vaultSize: rawMessageVault.size,
    oldestUnresolved: unresolved.length > 0 ? unresolved[0].receivedAt : null,
  };
}
