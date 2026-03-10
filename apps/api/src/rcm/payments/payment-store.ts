/**
 * Payment Store -- In-Memory Tenant-Scoped (Phase 92)
 *
 * Stores RemittanceBatches, RemittanceLines, PaymentPostingEvents,
 * and UnderpaymentCases. All tenant-scoped with indexed lookups.
 *
 * Resets on API restart (Phase 23 pattern).
 */

import { randomUUID } from 'node:crypto';
import { log } from '../../lib/logger.js';
import type {
  RemittanceBatch,
  RemittanceLine,
  PaymentPostingEvent,
  UnderpaymentCase,
  BatchStatus,
  LineMatchStatus,
  UnderpaymentStatus,
} from './payment-types.js';

/* -- DB repo interfaces (Phase 146: durable payment storage) -- */

function dbWarn(e: unknown): void {
  log.warn('Payment store PG write-through failed', { error: String(e) });
}

interface PaymentRepos {
  batchRepo: { upsert(data: any): Promise<any>; update(id: string, u: any): Promise<any> } | null;
  lineRepo: { upsert(data: any): Promise<any>; update(id: string, u: any): Promise<any> } | null;
  postingRepo: { insert(data: any): Promise<any> } | null;
  underpaymentRepo: {
    upsert(data: any): Promise<any>;
    update(id: string, u: any): Promise<any>;
  } | null;
}

const pgRepos: PaymentRepos = {
  batchRepo: null,
  lineRepo: null,
  postingRepo: null,
  underpaymentRepo: null,
};

export function initPaymentStoreRepos(repos: Partial<PaymentRepos>): void {
  if (repos.batchRepo) pgRepos.batchRepo = repos.batchRepo;
  if (repos.lineRepo) pgRepos.lineRepo = repos.lineRepo;
  if (repos.postingRepo) pgRepos.postingRepo = repos.postingRepo;
  if (repos.underpaymentRepo) pgRepos.underpaymentRepo = repos.underpaymentRepo;
}

/* -- Capacity Limits ----------------------------------------- */

const MAX_BATCHES = 10_000;
const MAX_LINES = 100_000;
const MAX_POSTINGS = 50_000;
const MAX_UNDERPAYMENTS = 20_000;

/* -- Primary Stores (cache layer -- PG is truth when wired) -- */

const batches = new Map<string, RemittanceBatch>();
const lines = new Map<string, RemittanceLine>();
const postings = new Map<string, PaymentPostingEvent>();
const underpayments = new Map<string, UnderpaymentCase>();

/* -- Indexes ------------------------------------------------- */

/** tenantId -> Set<batchId> */
const tenantBatchIndex = new Map<string, Set<string>>();
/** batchId -> Set<lineId> */
const batchLineIndex = new Map<string, Set<string>>();
/** claimCaseId -> Set<lineId> -- for fast claim lookup */
const claimLineIndex = new Map<string, Set<string>>();
/** tenantId -> Set<postingId> */
const tenantPostingIndex = new Map<string, Set<string>>();
/** tenantId -> Set<underpaymentId> */
const tenantUnderpaymentIndex = new Map<string, Set<string>>();
/** payerId -> Set<batchId> -- for payer intelligence */
const payerBatchIndex = new Map<string, Set<string>>();

/* -- Index Helpers ------------------------------------------- */

function addToIndex(index: Map<string, Set<string>>, key: string, value: string): void {
  if (!index.has(key)) index.set(key, new Set());
  index.get(key)!.add(value);
}

function removeFromIndex(index: Map<string, Set<string>>, key: string, value: string): void {
  const s = index.get(key);
  if (s) { s.delete(value); if (s.size === 0) index.delete(key); }
}

/** Evict oldest entries from a primary Map; returns evicted entries */
function evictOldest<V>(store: Map<string, V>, max: number): [string, V][] {
  const evicted: [string, V][] = [];
  while (store.size > max) {
    const first = store.entries().next().value as [string, V];
    store.delete(first[0]);
    evicted.push(first);
  }
  if (evicted.length) log.warn('Payment store eviction', { store: 'payment', evicted: evicted.length });
  return evicted;
}

/* -- Batch CRUD ---------------------------------------------- */

export interface CreateBatchParams {
  tenantId: string;
  facilityId: string;
  payerId: string;
  payerName?: string;
  sourceMode: RemittanceBatch['sourceMode'];
  createdBy: string;
  isDemo?: boolean;
}

export function createBatch(params: CreateBatchParams): RemittanceBatch {
  const now = new Date().toISOString();
  const batch: RemittanceBatch = {
    id: randomUUID(),
    tenantId: params.tenantId,
    facilityId: params.facilityId,
    payerId: params.payerId,
    payerName: params.payerName,
    sourceMode: params.sourceMode,
    receivedAt: now,
    status: 'created',
    matchedCount: 0,
    unmatchedCount: 0,
    needsReviewCount: 0,
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    isDemo: params.isDemo ?? false,
  };

  batches.set(batch.id, batch);
  for (const [evId, evBatch] of evictOldest(batches, MAX_BATCHES)) {
    removeFromIndex(tenantBatchIndex, evBatch.tenantId, evId);
    removeFromIndex(payerBatchIndex, evBatch.payerId, evId);
  }
  addToIndex(tenantBatchIndex, params.tenantId, batch.id);
  addToIndex(payerBatchIndex, params.payerId, batch.id);

  // Phase 146: Write-through to PG
  pgRepos.batchRepo
    ?.upsert({
      id: batch.id,
      tenantId: params.tenantId,
      payerId: params.payerId,
      payerName: params.payerName,
      paymentMethod: params.sourceMode,
      status: 'received',
      source: params.sourceMode,
      createdAt: now,
      updatedAt: now,
    })
    .catch(dbWarn);

  return batch;
}

export function getBatch(id: string): RemittanceBatch | undefined {
  return batches.get(id);
}

export function updateBatch(
  id: string,
  updates: Partial<RemittanceBatch>
): RemittanceBatch | undefined {
  const batch = batches.get(id);
  if (!batch) return undefined;

  // Protect immutable fields
  delete (updates as any).id;
  delete (updates as any).tenantId;
  delete (updates as any).createdAt;

  const updated: RemittanceBatch = {
    ...batch,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  batches.set(id, updated);

  // Phase 146: Write-through update
  pgRepos.batchRepo?.update(id, { ...updates, updatedAt: updated.updatedAt }).catch(dbWarn);

  return updated;
}

export function listBatches(filters: {
  tenantId: string;
  status?: BatchStatus;
  payerId?: string;
  limit?: number;
  offset?: number;
}): { items: RemittanceBatch[]; total: number } {
  const tenantSet = tenantBatchIndex.get(filters.tenantId);
  if (!tenantSet) return { items: [], total: 0 };

  let items = Array.from(tenantSet)
    .map((id) => batches.get(id)!)
    .filter(Boolean);

  if (filters.status) items = items.filter((b) => b.status === filters.status);
  if (filters.payerId) items = items.filter((b) => b.payerId === filters.payerId);

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;

  return { items: items.slice(offset, offset + limit), total };
}

/* -- Line CRUD ----------------------------------------------- */

export function addLine(line: Omit<RemittanceLine, 'id'>): RemittanceLine {
  const full: RemittanceLine = { ...line, id: randomUUID() };
  lines.set(full.id, full);
  for (const [evId, evLine] of evictOldest(lines, MAX_LINES)) {
    removeFromIndex(batchLineIndex, evLine.batchId, evId);
    if (evLine.matchedClaimCaseId) removeFromIndex(claimLineIndex, evLine.matchedClaimCaseId, evId);
  }
  addToIndex(batchLineIndex, full.batchId, full.id);
  if (full.matchedClaimCaseId) {
    addToIndex(claimLineIndex, full.matchedClaimCaseId, full.id);
  }

  // Phase 146: Write-through to PG
  pgRepos.lineRepo
    ?.upsert({
      id: full.id,
      tenantId: (full as any).tenantId,
      batchId: full.batchId,
      claimCaseId: full.matchedClaimCaseId ?? null,
      lineNumber: full.lineNumber,
      matchStatus: full.matchStatus,
    })
    .catch(dbWarn);

  return full;
}

export function getLine(id: string): RemittanceLine | undefined {
  return lines.get(id);
}

export function updateLine(
  id: string,
  updates: Partial<RemittanceLine>
): RemittanceLine | undefined {
  const line = lines.get(id);
  if (!line) return undefined;

  delete (updates as any).id;
  delete (updates as any).batchId;

  const updated: RemittanceLine = { ...line, ...updates };
  lines.set(id, updated);

  // Phase 146: Write-through update
  pgRepos.lineRepo?.update(id, updates).catch(dbWarn);

  // Update claim index if match changed
  if (updates.matchedClaimCaseId && updates.matchedClaimCaseId !== line.matchedClaimCaseId) {
    if (line.matchedClaimCaseId) {
      claimLineIndex.get(line.matchedClaimCaseId)?.delete(id);
    }
    addToIndex(claimLineIndex, updates.matchedClaimCaseId, id);
  }

  return updated;
}

export function listLines(filters: {
  batchId: string;
  matchStatus?: LineMatchStatus;
  limit?: number;
  offset?: number;
}): { items: RemittanceLine[]; total: number } {
  const lineSet = batchLineIndex.get(filters.batchId);
  if (!lineSet) return { items: [], total: 0 };

  let items = Array.from(lineSet)
    .map((id) => lines.get(id)!)
    .filter(Boolean);

  if (filters.matchStatus) items = items.filter((l) => l.matchStatus === filters.matchStatus);

  items.sort((a, b) => a.lineNumber - b.lineNumber);

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 100;

  return { items: items.slice(offset, offset + limit), total };
}

export function getLinesForClaim(claimCaseId: string): RemittanceLine[] {
  const lineSet = claimLineIndex.get(claimCaseId);
  if (!lineSet) return [];
  return Array.from(lineSet)
    .map((id) => lines.get(id)!)
    .filter(Boolean);
}

/** All unmatched/needs_review lines across a tenant */
export function getUnresolvedLines(tenantId: string, limit = 100): RemittanceLine[] {
  const tenantBatches = tenantBatchIndex.get(tenantId);
  if (!tenantBatches) return [];

  const result: RemittanceLine[] = [];
  for (const batchId of tenantBatches) {
    const lineSet = batchLineIndex.get(batchId);
    if (!lineSet) continue;
    for (const lineId of lineSet) {
      if (result.length >= limit) break;
      const line = lines.get(lineId);
      if (line && (line.matchStatus === 'needs_review' || line.matchStatus === 'unmatched')) {
        result.push(line);
      }
    }
  }
  return result;
}

/* -- Posting Events ------------------------------------------ */

export function recordPosting(posting: Omit<PaymentPostingEvent, 'id'>): PaymentPostingEvent {
  const full: PaymentPostingEvent = { ...posting, id: randomUUID() };
  postings.set(full.id, full);
  for (const [evId, evPost] of evictOldest(postings, MAX_POSTINGS)) {
    removeFromIndex(tenantPostingIndex, evPost.tenantId, evId);
  }
  addToIndex(tenantPostingIndex, full.tenantId, full.id);

  // Phase 146: Write-through to PG
  pgRepos.postingRepo
    ?.insert({
      id: full.id,
      tenantId: full.tenantId,
      claimCaseId: full.claimCaseId,
      batchId: full.batchId,
      amount: (full as any).amount ?? 0,
      postedAt: (full as any).postedAt ?? new Date().toISOString(),
    })
    .catch(dbWarn);

  return full;
}

export function getPostingsForClaim(claimCaseId: string): PaymentPostingEvent[] {
  return Array.from(postings.values()).filter((p) => p.claimCaseId === claimCaseId);
}

/* -- Underpayment Cases -------------------------------------- */

export function createUnderpayment(
  data: Omit<UnderpaymentCase, 'id' | 'createdAt' | 'status'>
): UnderpaymentCase {
  const uc: UnderpaymentCase = {
    ...data,
    id: randomUUID(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  underpayments.set(uc.id, uc);
  for (const [evId, evUc] of evictOldest(underpayments, MAX_UNDERPAYMENTS)) {
    removeFromIndex(tenantUnderpaymentIndex, evUc.tenantId, evId);
  }
  addToIndex(tenantUnderpaymentIndex, uc.tenantId, uc.id);

  // Phase 146: Write-through to PG
  pgRepos.underpaymentRepo
    ?.upsert({
      id: uc.id,
      tenantId: uc.tenantId,
      claimId: (uc as any).claimId ?? (uc as any).claimCaseId ?? '',
      payerId: uc.payerId,
      expectedAmount: uc.expectedAmount,
      paidAmount: uc.paidAmount,
      variance: (uc as any).variance ?? uc.expectedAmount - uc.paidAmount,
      status: uc.status,
      createdAt: uc.createdAt,
    })
    .catch(dbWarn);

  return uc;
}

export function getUnderpayment(id: string): UnderpaymentCase | undefined {
  return underpayments.get(id);
}

export function updateUnderpayment(
  id: string,
  updates: Partial<
    Pick<UnderpaymentCase, 'status' | 'resolvedAt' | 'resolvedBy' | 'resolutionNote'>
  >
): UnderpaymentCase | undefined {
  const uc = underpayments.get(id);
  if (!uc) return undefined;
  const updated: UnderpaymentCase = { ...uc, ...updates };
  underpayments.set(id, updated);

  // Phase 146: Write-through update
  pgRepos.underpaymentRepo?.update(id, updates).catch(dbWarn);

  return updated;
}

export function listUnderpayments(filters: {
  tenantId: string;
  status?: UnderpaymentStatus;
  payerId?: string;
  limit?: number;
  offset?: number;
}): { items: UnderpaymentCase[]; total: number } {
  const tenantSet = tenantUnderpaymentIndex.get(filters.tenantId);
  if (!tenantSet) return { items: [], total: 0 };

  let items = Array.from(tenantSet)
    .map((id) => underpayments.get(id)!)
    .filter(Boolean);

  if (filters.status) items = items.filter((u) => u.status === filters.status);
  if (filters.payerId) items = items.filter((u) => u.payerId === filters.payerId);

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = items.length;
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 50;

  return { items: items.slice(offset, offset + limit), total };
}

/* -- Store Stats --------------------------------------------- */

export function getPaymentStoreInfo(): {
  totalBatches: number;
  totalLines: number;
  totalPostings: number;
  totalUnderpayments: number;
  tenants: number;
} {
  return {
    totalBatches: batches.size,
    totalLines: lines.size,
    totalPostings: postings.size,
    totalUnderpayments: underpayments.size,
    tenants: tenantBatchIndex.size,
  };
}

/** Get all batches for a payer (cross-tenant for intelligence) */
export function getBatchesForPayer(payerId: string): RemittanceBatch[] {
  const batchSet = payerBatchIndex.get(payerId);
  if (!batchSet) return [];
  return Array.from(batchSet)
    .map((id) => batches.get(id)!)
    .filter(Boolean);
}

/** Get all lines for a batch (internal) */
export function getAllLinesForBatch(batchId: string): RemittanceLine[] {
  const lineSet = batchLineIndex.get(batchId);
  if (!lineSet) return [];
  return Array.from(lineSet)
    .map((id) => lines.get(id)!)
    .filter(Boolean);
}

/** Reset all stores -- used in tests */
export function resetPaymentStore(): void {
  batches.clear();
  lines.clear();
  postings.clear();
  underpayments.clear();
  tenantBatchIndex.clear();
  batchLineIndex.clear();
  claimLineIndex.clear();
  tenantPostingIndex.clear();
  tenantUnderpaymentIndex.clear();
  payerBatchIndex.clear();
}
