/**
 * Transaction Envelope Factory
 *
 * Phase 45: Builds properly structured transaction envelopes with
 * auto-generated control numbers, correlation IDs, and idempotency keys.
 */

import { randomUUID, randomBytes, createHash } from 'node:crypto';
import type { TransactionEnvelope, TransactionRecord, TransactionState } from './types.js';
import type { X12TransactionSet, IsaEnvelope, GsEnvelope } from '../edi/types.js';
import { TRANSACTION_STATE_TRANSITIONS } from './types.js';

/* ── Control number generator ────────────────────────────────── */

const controlCounters = new Map<string, number>();

/**
 * Generate a unique, monotonically increasing ISA13 control number
 * per sender/receiver pair. Resets on API restart (in-memory).
 */
export function nextControlNumber(senderId: string, receiverId: string): string {
  const key = `${senderId}:${receiverId}`;
  const current = controlCounters.get(key) ?? 0;
  const next = current + 1;
  controlCounters.set(key, next);
  return String(next).padStart(9, '0');
}

/* ── Envelope builder ────────────────────────────────────────── */

export interface EnvelopeOptions {
  transactionSet: X12TransactionSet;
  senderId: string;
  receiverId: string;
  senderQualifier?: string;
  receiverQualifier?: string;
  usageIndicator?: 'T' | 'P';
  sourceId?: string;
  sourceType?: 'claim' | 'eligibility' | 'status_inquiry' | 'prior_auth';
  correlationId?: string;
}

/** GS01 functional identifier code per transaction type */
const GS_FUNCTIONAL_CODES: Partial<Record<X12TransactionSet, string>> = {
  '837P': 'HC',
  '837I': 'HC',
  '835':  'HP',
  '270':  'HS',
  '271':  'HB',
  '276':  'HN',
  '277':  'HN',
  '278':  'HI',
  '275':  'HI',
  '999':  'FA',
  '997':  'FA',
  'TA1':  'FA',
};

/** GS08 version/release/industry identifier */
const GS_VERSION_CODES: Partial<Record<X12TransactionSet, string>> = {
  '837P': '005010X222A1',
  '837I': '005010X223A3',
  '835':  '005010X221A1',
  '270':  '005010X279A1',
  '271':  '005010X279A1',
  '276':  '005010X212',
  '277':  '005010X212',
  '278':  '005010X217',
  '999':  '005010X231A1',
};

export function buildEnvelope(options: EnvelopeOptions): TransactionEnvelope {
  const now = new Date();
  const controlNumber = nextControlNumber(options.senderId, options.receiverId);
  const correlationId = options.correlationId ?? randomUUID();
  const transactionId = `txn-${Date.now()}-${randomBytes(4).toString('hex')}`;

  const isa: IsaEnvelope = {
    senderId: options.senderId.padEnd(15, ' '),
    receiverId: options.receiverId.padEnd(15, ' '),
    senderQualifier: options.senderQualifier ?? 'ZZ',
    receiverQualifier: options.receiverQualifier ?? 'ZZ',
    controlNumber,
    date: formatISADate(now),
    time: formatISATime(now),
    versionNumber: '00501',
    usageIndicator: options.usageIndicator ?? 'T',
  };

  const gs: GsEnvelope = {
    functionalCode: GS_FUNCTIONAL_CODES[options.transactionSet] ?? 'HC',
    senderId: options.senderId,
    receiverId: options.receiverId,
    controlNumber,
    versionCode: GS_VERSION_CODES[options.transactionSet] ?? '005010X222A1',
  };

  return {
    transactionId,
    transactionSet: options.transactionSet,
    isa,
    gs,
    correlationId,
    idempotencyKey: buildIdempotencyKey(options),
    controlNumber,
    senderId: options.senderId,
    receiverId: options.receiverId,
    createdAt: now.toISOString(),
    direction: 'outbound',
    sourceId: options.sourceId,
    sourceType: options.sourceType,
  };
}

/* ── Idempotency key ─────────────────────────────────────────── */

function buildIdempotencyKey(options: EnvelopeOptions): string {
  const payload = `${options.transactionSet}:${options.senderId}:${options.receiverId}:${options.sourceId ?? 'none'}:${Date.now()}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/* ── Date formatters ─────────────────────────────────────────── */

function formatISADate(d: Date): string {
  return d.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);
}

function formatISATime(d: Date): string {
  return d.toISOString().slice(11, 16).replace(':', '');
}

/* ── Transaction Store (in-memory) ───────────────────────────── */

const transactionStore = new Map<string, TransactionRecord>();
const correlationIndex = new Map<string, string[]>(); // correlationId → txnIds
const sourceIndex = new Map<string, string[]>(); // sourceId → txnIds

export function storeTransaction(envelope: TransactionEnvelope, x12Payload?: string): TransactionRecord {
  const now = new Date().toISOString();
  const record: TransactionRecord = {
    id: envelope.transactionId,
    envelope,
    state: 'created',
    x12Payload,
    errors: [],
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  transactionStore.set(record.id, record);

  // Index by correlation
  const corr = correlationIndex.get(envelope.correlationId) ?? [];
  corr.push(record.id);
  correlationIndex.set(envelope.correlationId, corr);

  // Index by source
  if (envelope.sourceId) {
    const src = sourceIndex.get(envelope.sourceId) ?? [];
    src.push(record.id);
    sourceIndex.set(envelope.sourceId, src);
  }

  return record;
}

export function getTransaction(id: string): TransactionRecord | undefined {
  return transactionStore.get(id);
}

export function getTransactionsByCorrelation(correlationId: string): TransactionRecord[] {
  const ids = correlationIndex.get(correlationId) ?? [];
  return ids.map(id => transactionStore.get(id)!).filter(Boolean);
}

export function getTransactionsBySource(sourceId: string): TransactionRecord[] {
  const ids = sourceIndex.get(sourceId) ?? [];
  return ids.map(id => transactionStore.get(id)!).filter(Boolean);
}

export function transitionTransaction(
  id: string,
  newState: TransactionState,
  detail?: { responsePayload?: string; error?: { code: string; description: string; severity: string } },
): TransactionRecord | null {
  const record = transactionStore.get(id);
  if (!record) return null;

  const allowed = TRANSACTION_STATE_TRANSITIONS[record.state];
  if (!allowed.includes(newState)) return null;

  record.state = newState;
  record.updatedAt = new Date().toISOString();

  if (detail?.responsePayload) record.responsePayload = detail.responsePayload;
  if (detail?.error) {
    record.errors.push({ ...detail.error, timestamp: record.updatedAt });
    record.retryCount++;
    record.lastRetryAt = record.updatedAt;
  }

  if (newState === 'reconciled' || newState === 'failed' || newState === 'cancelled') {
    record.completedAt = record.updatedAt;
  }

  transactionStore.set(id, record);
  return record;
}

export function listTransactions(filters?: {
  state?: TransactionState;
  transactionSet?: X12TransactionSet;
  sourceId?: string;
  limit?: number;
}): TransactionRecord[] {
  let results = Array.from(transactionStore.values());

  if (filters?.state) results = results.filter(r => r.state === filters.state);
  if (filters?.transactionSet) results = results.filter(r => r.envelope.transactionSet === filters.transactionSet);
  if (filters?.sourceId) results = results.filter(r => r.envelope.sourceId === filters.sourceId);

  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (filters?.limit) results = results.slice(0, filters.limit);

  return results;
}

export function getTransactionStats(): {
  total: number;
  byState: Record<string, number>;
  byTransactionSet: Record<string, number>;
  dlqCount: number;
  failedCount: number;
} {
  const byState: Record<string, number> = {};
  const byTransactionSet: Record<string, number> = {};
  let dlqCount = 0;
  let failedCount = 0;

  for (const r of transactionStore.values()) {
    byState[r.state] = (byState[r.state] ?? 0) + 1;
    byTransactionSet[r.envelope.transactionSet] = (byTransactionSet[r.envelope.transactionSet] ?? 0) + 1;
    if (r.state === 'dlq') dlqCount++;
    if (r.state === 'failed') failedCount++;
  }

  return { total: transactionStore.size, byState, byTransactionSet, dlqCount, failedCount };
}

export function resetTransactionStore(): void {
  transactionStore.clear();
  correlationIndex.clear();
  sourceIndex.clear();
  controlCounters.clear();
}
