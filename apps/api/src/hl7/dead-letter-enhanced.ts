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
