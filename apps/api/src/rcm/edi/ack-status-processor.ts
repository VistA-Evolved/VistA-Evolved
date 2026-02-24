/**
 * RCM — Ack & Status Processor (Phase 43)
 *
 * Handles ingestion of:
 *   - 999 Implementation Acknowledgements
 *   - 277CA Claim Acknowledgements
 *   - 276/277 Claim Status Inquiry/Response
 *
 * Normalizes raw payloads into domain models, links to claims,
 * creates workqueue items for rejections, and records history.
 */

import { createAck, createStatusUpdate } from '../domain/ack-status.js';
import type { Acknowledgement, AckType, AckDisposition, AckError, ClaimStatusUpdate } from '../domain/ack-status.js';
import { getClaim, updateClaim } from '../domain/claim-store.js';
import { transitionClaim } from '../domain/claim.js';
import { createWorkqueueItem } from '../workqueues/workqueue-store.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import { buildActionRecommendation, lookupCarc } from '../reference/carc-rarc.js';

/* ── Ack Store (in-memory) ─────────────────────────────────── */

const acks = new Map<string, Acknowledgement>();
const claimAckIndex = new Map<string, string[]>(); // claimId → ack IDs
const idempotencyIndex = new Map<string, string>(); // idempotencyKey → ack ID

/* ── Status Store (in-memory) ──────────────────────────────── */

const statusUpdates = new Map<string, ClaimStatusUpdate>();
const claimStatusIndex = new Map<string, string[]>(); // claimId → status IDs
const statusIdempotencyIndex = new Map<string, string>();

/* ── Ack Ingestion ─────────────────────────────────────────── */

export interface AckIngestInput {
  type: AckType;
  disposition: AckDisposition;
  originalControlNumber: string;
  ackControlNumber: string;
  claimId?: string;
  payerId?: string;
  payerName?: string;
  errors?: AckError[];
  rawPayload?: string;
  idempotencyKey: string;
}

export interface AckIngestResult {
  ok: boolean;
  ack: Acknowledgement;
  claimUpdated: boolean;
  workqueueItemCreated: boolean;
  idempotent: boolean;
}

export async function ingestAck(input: AckIngestInput): Promise<AckIngestResult> {
  // Idempotency check
  const existingId = idempotencyIndex.get(input.idempotencyKey);
  if (existingId) {
    const existing = acks.get(existingId)!;
    return { ok: true, ack: existing, claimUpdated: false, workqueueItemCreated: false, idempotent: true };
  }

  const ack = createAck({
    type: input.type,
    disposition: input.disposition,
    claimId: input.claimId,
    originalControlNumber: input.originalControlNumber,
    ackControlNumber: input.ackControlNumber,
    payerId: input.payerId,
    payerName: input.payerName,
    errors: input.errors,
    rawPayload: input.rawPayload,
    idempotencyKey: input.idempotencyKey,
  });

  // Store
  acks.set(ack.id, ack);
  idempotencyIndex.set(input.idempotencyKey, ack.id);
  if (ack.claimId) {
    if (!claimAckIndex.has(ack.claimId)) claimAckIndex.set(ack.claimId, []);
    claimAckIndex.get(ack.claimId)!.push(ack.id);
  }

  // Link to claim and update status
  let claimUpdated = false;
  let workqueueItemCreated = false;

  if (ack.claimId) {
    const claim = getClaim(ack.claimId);
    if (claim) {
      if (ack.disposition === 'accepted' && claim.status === 'submitted') {
        const updated = transitionClaim(claim, 'accepted', 'system', `Ack ${ack.type} accepted`);
        updateClaim(updated);
        claimUpdated = true;
      } else if (ack.disposition === 'rejected' && claim.status === 'submitted') {
        const updated = transitionClaim(claim, 'rejected', 'system', `Ack ${ack.type} rejected: ${ack.errors.map(e => e.description).join('; ')}`);
        updateClaim(updated);
        claimUpdated = true;

        // Create workqueue item for rejection
        for (const err of ack.errors) {
          const recommendation = buildActionRecommendation(err.errorCode);
          await createWorkqueueItem({
            type: 'rejection',
            claimId: ack.claimId,
            payerId: ack.payerId,
            payerName: ack.payerName,
            reasonCode: err.errorCode,
            reasonDescription: err.description,
            recommendedAction: recommendation.action,
            fieldToFix: recommendation.fieldHint ?? err.segmentId,
            triggeringRule: `${ack.type}_error_${err.errorCode}`,
            sourceType: ack.type === '999' ? 'ack_999' : 'ack_277ca',
            sourceId: ack.id,
            sourceTimestamp: ack.receivedAt,
            priority: 'high',
          });
          workqueueItemCreated = true;
        }
      }
    }
  }

  appendRcmAudit('edi.ack', {
    claimId: ack.claimId,
    payerId: ack.payerId,
    detail: {
      ackId: ack.id,
      type: ack.type,
      disposition: ack.disposition,
      errorCount: ack.errors.length,
      claimUpdated,
    },
  });

  return { ok: true, ack, claimUpdated, workqueueItemCreated, idempotent: false };
}

/* ── Status Ingestion ──────────────────────────────────────── */

export interface StatusIngestInput {
  claimId?: string;
  payerClaimId?: string;
  categoryCode: string;
  statusCode: string;
  statusDescription: string;
  effectiveDate?: string;
  checkDate?: string;
  totalCharged?: number;
  totalPaid?: number;
  payerId?: string;
  payerName?: string;
  rawPayload?: string;
  idempotencyKey: string;
}

export interface StatusIngestResult {
  ok: boolean;
  statusUpdate: ClaimStatusUpdate;
  claimUpdated: boolean;
  workqueueItemCreated: boolean;
  idempotent: boolean;
}

export async function ingestStatusUpdate(input: StatusIngestInput): Promise<StatusIngestResult> {
  // Idempotency check
  const existingId = statusIdempotencyIndex.get(input.idempotencyKey);
  if (existingId) {
    const existing = statusUpdates.get(existingId)!;
    return { ok: true, statusUpdate: existing, claimUpdated: false, workqueueItemCreated: false, idempotent: true };
  }

  const status = createStatusUpdate({
    claimId: input.claimId,
    payerClaimId: input.payerClaimId,
    categoryCode: input.categoryCode,
    statusCode: input.statusCode,
    statusDescription: input.statusDescription,
    effectiveDate: input.effectiveDate,
    checkDate: input.checkDate,
    totalCharged: input.totalCharged,
    totalPaid: input.totalPaid,
    payerId: input.payerId,
    payerName: input.payerName,
    rawPayload: input.rawPayload,
    idempotencyKey: input.idempotencyKey,
  });

  // Store
  statusUpdates.set(status.id, status);
  statusIdempotencyIndex.set(input.idempotencyKey, status.id);
  if (status.claimId) {
    if (!claimStatusIndex.has(status.claimId)) claimStatusIndex.set(status.claimId, []);
    claimStatusIndex.get(status.claimId)!.push(status.id);
  }

  // Interpret category code for claim lifecycle
  let claimUpdated = false;
  let workqueueItemCreated = false;

  if (status.claimId) {
    const claim = getClaim(status.claimId);
    if (claim) {
      const cat = status.categoryCode;

      // F1 = Finalized with payment
      if (cat === 'F1' && (claim.status === 'accepted' || claim.status === 'submitted')) {
        const updated = transitionClaim(claim, 'paid', 'system', `277 finalized: payment issued`);
        updated.paidAmount = status.totalPaid;
        updateClaim(updated);
        claimUpdated = true;
      }
      // F2/D0 = Finalized denial
      else if ((cat === 'F2' || cat === 'D0') && (claim.status === 'accepted' || claim.status === 'submitted')) {
        const updated = transitionClaim(claim, 'denied', 'system', `277 denied: ${status.statusDescription}`);
        updateClaim(updated);
        claimUpdated = true;

        await createWorkqueueItem({
          type: 'denial',
          claimId: status.claimId,
          payerId: status.payerId,
          payerName: status.payerName,
          reasonCode: status.statusCode,
          reasonDescription: status.statusDescription,
          recommendedAction: `Review 277 status (${cat}): ${status.statusDescription}`,
          sourceType: 'status_277',
          sourceId: status.id,
          sourceTimestamp: status.receivedAt,
          priority: 'high',
        });
        workqueueItemCreated = true;
      }
      // P1/R0/R1 = Pending additional info
      else if (['P1', 'R0', 'R1'].includes(cat)) {
        await createWorkqueueItem({
          type: 'missing_info',
          claimId: status.claimId,
          payerId: status.payerId,
          payerName: status.payerName,
          reasonCode: status.statusCode,
          reasonDescription: status.statusDescription,
          recommendedAction: `Payer requests additional information: ${status.statusDescription}`,
          sourceType: 'status_277',
          sourceId: status.id,
          sourceTimestamp: status.receivedAt,
          priority: 'medium',
        });
        workqueueItemCreated = true;
      }
    }
  }

  appendRcmAudit('edi.inbound', {
    claimId: status.claimId,
    payerId: status.payerId,
    detail: {
      statusId: status.id,
      categoryCode: status.categoryCode,
      statusCode: status.statusCode,
      claimUpdated,
    },
  });

  return { ok: true, statusUpdate: status, claimUpdated, workqueueItemCreated, idempotent: false };
}

/* ── Query Functions ───────────────────────────────────────── */

export function getAck(id: string): Acknowledgement | undefined {
  return acks.get(id);
}

export function getAcksForClaim(claimId: string): Acknowledgement[] {
  const ids = claimAckIndex.get(claimId) ?? [];
  return ids.map(id => acks.get(id)!).filter(Boolean);
}

export function listAcks(filters?: {
  type?: AckType;
  disposition?: AckDisposition;
  claimId?: string;
  limit?: number;
  offset?: number;
}): { acks: Acknowledgement[]; total: number } {
  let result = Array.from(acks.values());
  if (filters?.type) result = result.filter(a => a.type === filters.type);
  if (filters?.disposition) result = result.filter(a => a.disposition === filters.disposition);
  if (filters?.claimId) result = result.filter(a => a.claimId === filters.claimId);
  result.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  return { acks: result.slice(offset, offset + limit), total };
}

export function getStatusUpdate(id: string): ClaimStatusUpdate | undefined {
  return statusUpdates.get(id);
}

export function getStatusUpdatesForClaim(claimId: string): ClaimStatusUpdate[] {
  const ids = claimStatusIndex.get(claimId) ?? [];
  return ids.map(id => statusUpdates.get(id)!).filter(Boolean);
}

export function listStatusUpdates(filters?: {
  categoryCode?: string;
  claimId?: string;
  limit?: number;
  offset?: number;
}): { statusUpdates: ClaimStatusUpdate[]; total: number } {
  let result = Array.from(statusUpdates.values());
  if (filters?.categoryCode) result = result.filter(s => s.categoryCode === filters.categoryCode);
  if (filters?.claimId) result = result.filter(s => s.claimId === filters.claimId);
  result.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  return { statusUpdates: result.slice(offset, offset + limit), total };
}

/* ── Stats ─────────────────────────────────────────────────── */

export function getAckStats(): {
  total: number;
  byType: Record<string, number>;
  byDisposition: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  const byDisposition: Record<string, number> = {};
  for (const ack of acks.values()) {
    byType[ack.type] = (byType[ack.type] ?? 0) + 1;
    byDisposition[ack.disposition] = (byDisposition[ack.disposition] ?? 0) + 1;
  }
  return { total: acks.size, byType, byDisposition };
}

export function getStatusStats(): {
  total: number;
  byCategoryCode: Record<string, number>;
} {
  const byCategoryCode: Record<string, number> = {};
  for (const s of statusUpdates.values()) {
    byCategoryCode[s.categoryCode] = (byCategoryCode[s.categoryCode] ?? 0) + 1;
  }
  return { total: statusUpdates.size, byCategoryCode };
}

export function resetAckStore(): void {
  acks.clear();
  claimAckIndex.clear();
  idempotencyIndex.clear();
}

export function resetStatusStore(): void {
  statusUpdates.clear();
  claimStatusIndex.clear();
  statusIdempotencyIndex.clear();
}
