/**
 * Claim Draft Repository -- Phase 111
 *
 * DB-backed CRUD for claim_draft + claim_lifecycle_event tables.
 * Implements the claim lifecycle FSM with denial/appeal/resubmission support.
 *
 * VistA-first: claim drafts may reference VistA encounter IEN, charge IEN,
 * and AR IEN. The in-memory claim store (Phase 38) coexists -- this repo
 * provides persistent, reconciliation-ready storage.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, desc, count, lte, gte, sql } from 'drizzle-orm';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { claimDraft, claimLifecycleEvent } from '../../platform/pg/pg-schema.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ClaimDraftStatus =
  | 'draft'
  | 'scrubbed'
  | 'ready'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'denied'
  | 'appealed'
  | 'closed';

export const VALID_TRANSITIONS: Record<ClaimDraftStatus, ClaimDraftStatus[]> = {
  draft: ['scrubbed', 'closed'],
  scrubbed: ['ready', 'draft', 'closed'],
  ready: ['submitted', 'scrubbed', 'draft', 'closed'],
  submitted: ['accepted', 'rejected', 'closed'],
  accepted: ['paid', 'denied', 'closed'],
  rejected: ['draft', 'appealed', 'closed'],
  paid: ['closed'],
  denied: ['appealed', 'closed'],
  appealed: ['accepted', 'rejected', 'paid', 'denied', 'closed'],
  closed: [],
};

export function isValidDraftTransition(from: ClaimDraftStatus, to: ClaimDraftStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ClaimDraftRow {
  id: string;
  tenantId: string;
  idempotencyKey: string | null;
  status: ClaimDraftStatus;
  claimType: string;
  encounterId: string | null;
  patientId: string;
  patientName: string | null;
  providerId: string;
  billingProviderId: string | null;
  payerId: string;
  payerName: string | null;
  dateOfService: string;
  diagnoses: any[];
  lines: any[];
  attachments: any[];
  totalChargeCents: number;
  denialCode: string | null;
  denialReason: string | null;
  appealPacketRef: string | null;
  resubmissionOf: string | null;
  resubmissionCount: number;
  paidAmountCents: number | null;
  adjustmentCents: number | null;
  patientRespCents: number | null;
  scrubScore: number | null;
  lastScrubAt: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  deniedAt: string | null;
  closedAt: string | null;
  vistaChargeIen: string | null;
  vistaArIen: string | null;
  metadata: Record<string, unknown>;
  audit: any[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ClaimLifecycleEventRow {
  id: string;
  claimDraftId: string;
  tenantId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  reason: string | null;
  denialCode: string | null;
  resubmissionRef: string | null;
  detail: Record<string, unknown>;
  occurredAt: string;
}

export interface CreateClaimDraftInput {
  tenantId: string;
  idempotencyKey?: string;
  claimType?: string;
  encounterId?: string;
  patientId: string;
  patientName?: string;
  providerId: string;
  billingProviderId?: string;
  payerId: string;
  payerName?: string;
  dateOfService: string;
  diagnoses?: any[];
  lines?: any[];
  attachments?: any[];
  totalChargeCents?: number;
  vistaChargeIen?: string;
  vistaArIen?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function parseDraft(row: any): ClaimDraftRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    idempotencyKey: row.idempotencyKey,
    status: row.status as ClaimDraftStatus,
    claimType: row.claimType,
    encounterId: row.encounterId,
    patientId: row.patientId,
    patientName: row.patientName,
    providerId: row.providerId,
    billingProviderId: row.billingProviderId,
    payerId: row.payerId,
    payerName: row.payerName,
    dateOfService: row.dateOfService,
    diagnoses: safeJsonParse(row.diagnosesJson, []),
    lines: safeJsonParse(row.linesJson, []),
    attachments: safeJsonParse(row.attachmentsJson, []),
    totalChargeCents: row.totalChargeCents ?? 0,
    denialCode: row.denialCode,
    denialReason: row.denialReason,
    appealPacketRef: row.appealPacketRef,
    resubmissionOf: row.resubmissionOf,
    resubmissionCount: row.resubmissionCount ?? 0,
    paidAmountCents: row.paidAmountCents,
    adjustmentCents: row.adjustmentCents,
    patientRespCents: row.patientRespCents,
    scrubScore: row.scrubScore,
    lastScrubAt: row.lastScrubAt,
    submittedAt: row.submittedAt,
    paidAt: row.paidAt,
    deniedAt: row.deniedAt,
    closedAt: row.closedAt,
    vistaChargeIen: row.vistaChargeIen,
    vistaArIen: row.vistaArIen,
    metadata: safeJsonParse(row.metadataJson, {}),
    audit: safeJsonParse(row.auditJson, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

function parseEvent(row: any): ClaimLifecycleEventRow {
  return {
    id: row.id,
    claimDraftId: row.claimDraftId,
    tenantId: row.tenantId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    actor: row.actor,
    reason: row.reason,
    denialCode: row.denialCode,
    resubmissionRef: row.resubmissionRef,
    detail: safeJsonParse(row.detailJson, {}),
    occurredAt: row.occurredAt,
  };
}

/* ------------------------------------------------------------------ */
/* Claim Draft CRUD                                                    */
/* ------------------------------------------------------------------ */

export async function createClaimDraft(input: CreateClaimDraftInput): Promise<ClaimDraftRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId;

  // Idempotency check: if key provided and already exists, return existing
  if (input.idempotencyKey) {
    const existingRows = await db
      .select()
      .from(claimDraft)
      .where(
        and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.idempotencyKey, input.idempotencyKey))
      );
    if (existingRows[0]) return parseDraft(existingRows[0]);
  }

  const lines = input.lines ?? [];
  const totalCharge =
    input.totalChargeCents ??
    lines.reduce((sum: number, l: any) => sum + (l.procedure?.charge ?? l.chargeAmount ?? 0), 0);

  const auditEntry = [
    {
      timestamp: now,
      action: 'draft.created',
      actor: input.createdBy,
      toStatus: 'draft',
      detail: 'Claim draft created',
    },
  ];

  await db.insert(claimDraft).values({
    id,
    tenantId,
    idempotencyKey: input.idempotencyKey || null,
    status: 'draft',
    claimType: input.claimType || 'professional',
    encounterId: input.encounterId || null,
    patientId: input.patientId,
    patientName: input.patientName || null,
    providerId: input.providerId,
    billingProviderId: input.billingProviderId || null,
    payerId: input.payerId,
    payerName: input.payerName || null,
    dateOfService: input.dateOfService,
    diagnosesJson: JSON.stringify(input.diagnoses || []),
    linesJson: JSON.stringify(lines),
    attachmentsJson: JSON.stringify(input.attachments || []),
    totalChargeCents: totalCharge,
    vistaChargeIen: input.vistaChargeIen || null,
    vistaArIen: input.vistaArIen || null,
    metadataJson: JSON.stringify(input.metadata || {}),
    auditJson: JSON.stringify(auditEntry),
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
  });

  // Record lifecycle event
  await recordLifecycleEvent(tenantId, id, null, 'draft', input.createdBy, 'Claim draft created');

  return (await getClaimDraftById(tenantId, id))!;
}

export async function getClaimDraftById(
  tenantId: string,
  id: string
): Promise<ClaimDraftRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)));
  const row = rows[0] ?? null;
  return row ? parseDraft(row) : null;
}

export async function listClaimDrafts(
  tenantId: string,
  filters?: {
    status?: string;
    payerId?: string;
    patientId?: string;
    encounterId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  limit: number = 100,
  offset: number = 0
): Promise<ClaimDraftRow[]> {
  const db = getPgDb();
  const conditions = [eq(claimDraft.tenantId, tenantId)];
  if (filters?.status) conditions.push(eq(claimDraft.status, filters.status));
  if (filters?.payerId) conditions.push(eq(claimDraft.payerId, filters.payerId));
  if (filters?.patientId) conditions.push(eq(claimDraft.patientId, filters.patientId));
  if (filters?.encounterId) conditions.push(eq(claimDraft.encounterId, filters.encounterId));
  if (filters?.dateFrom) conditions.push(gte(claimDraft.dateOfService, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(claimDraft.dateOfService, filters.dateTo));

  const rows = await db
    .select()
    .from(claimDraft)
    .where(and(...conditions))
    .orderBy(desc(claimDraft.updatedAt))
    .limit(limit)
    .offset(offset);
  return rows.map(parseDraft);
}

export async function updateClaimDraft(
  tenantId: string,
  id: string,
  updates: Partial<
    Pick<
      CreateClaimDraftInput,
      | 'patientName'
      | 'providerId'
      | 'billingProviderId'
      | 'payerName'
      | 'diagnoses'
      | 'lines'
      | 'attachments'
      | 'totalChargeCents'
      | 'metadata'
    >
  >,
  actor: string
): Promise<ClaimDraftRow | null> {
  const db = getPgDb();
  const existing = await getClaimDraftById(tenantId, id);
  if (!existing) return null;
  if (existing.status !== 'draft' && existing.status !== 'scrubbed') {
    throw new Error(`Cannot update claim in status: ${existing.status}`);
  }

  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.patientName !== undefined) setClause.patientName = updates.patientName;
  if (updates.providerId !== undefined) setClause.providerId = updates.providerId;
  if (updates.billingProviderId !== undefined)
    setClause.billingProviderId = updates.billingProviderId;
  if (updates.payerName !== undefined) setClause.payerName = updates.payerName;
  if (updates.diagnoses !== undefined) setClause.diagnosesJson = JSON.stringify(updates.diagnoses);
  if (updates.lines !== undefined) {
    setClause.linesJson = JSON.stringify(updates.lines);
    if (updates.totalChargeCents === undefined) {
      setClause.totalChargeCents = updates.lines.reduce(
        (sum: number, l: any) => sum + (l.procedure?.charge ?? l.chargeAmount ?? 0),
        0
      );
    }
  }
  if (updates.attachments !== undefined)
    setClause.attachmentsJson = JSON.stringify(updates.attachments);
  if (updates.totalChargeCents !== undefined) setClause.totalChargeCents = updates.totalChargeCents;
  if (updates.metadata !== undefined) setClause.metadataJson = JSON.stringify(updates.metadata);

  // Append audit entry
  const auditEntry = {
    timestamp: now,
    action: 'draft.updated',
    actor,
    detail: 'Claim draft updated',
  };
  const auditTrail = [...existing.audit, auditEntry];
  setClause.auditJson = JSON.stringify(auditTrail);

  await db
    .update(claimDraft)
    .set(setClause)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)));

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Status Transitions                                                  */
/* ------------------------------------------------------------------ */

export async function transitionClaimDraft(
  tenantId: string,
  id: string,
  toStatus: ClaimDraftStatus,
  actor: string,
  opts?: {
    reason?: string;
    denialCode?: string;
    paidAmountCents?: number;
    adjustmentCents?: number;
    patientRespCents?: number;
  }
): Promise<ClaimDraftRow | null> {
  const existing = await getClaimDraftById(tenantId, id);
  if (!existing) return null;

  if (!isValidDraftTransition(existing.status, toStatus)) {
    throw new Error(`Invalid transition: ${existing.status} -> ${toStatus}`);
  }

  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { status: toStatus, updatedAt: now };

  // Status-specific fields
  if (toStatus === 'submitted') setClause.submittedAt = now;
  if (toStatus === 'paid') {
    setClause.paidAt = now;
    if (opts?.paidAmountCents !== undefined) setClause.paidAmountCents = opts.paidAmountCents;
    if (opts?.adjustmentCents !== undefined) setClause.adjustmentCents = opts.adjustmentCents;
    if (opts?.patientRespCents !== undefined) setClause.patientRespCents = opts.patientRespCents;
  }
  if (toStatus === 'denied') {
    setClause.deniedAt = now;
    if (opts?.denialCode) setClause.denialCode = opts.denialCode;
    if (opts?.reason) setClause.denialReason = opts.reason;
  }
  if (toStatus === 'closed') setClause.closedAt = now;

  // Append audit
  const auditEntry = {
    timestamp: now,
    action: `draft.${toStatus}`,
    actor,
    fromStatus: existing.status,
    toStatus,
    detail: opts?.reason || `Transitioned to ${toStatus}`,
  };
  const auditTrail = [...existing.audit, auditEntry];
  setClause.auditJson = JSON.stringify(auditTrail);

  await db
    .update(claimDraft)
    .set(setClause)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)));

  // Record lifecycle event
  await recordLifecycleEvent(
    tenantId,
    id,
    existing.status,
    toStatus,
    actor,
    opts?.reason,
    opts?.denialCode
  );

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Denial + Resubmission                                               */
/* ------------------------------------------------------------------ */

export async function recordDenial(
  tenantId: string,
  id: string,
  denialCode: string,
  denialReason: string,
  actor: string
): Promise<ClaimDraftRow | null> {
  return transitionClaimDraft(tenantId, id, 'denied', actor, {
    denialCode,
    reason: denialReason,
  });
}

/**
 * Create a resubmission claim draft from a denied/rejected original.
 * Links back via resubmissionOf and increments resubmissionCount.
 */
export async function createResubmission(
  tenantId: string,
  originalId: string,
  actor: string,
  overrides?: Partial<CreateClaimDraftInput>
): Promise<ClaimDraftRow | null> {
  const original = await getClaimDraftById(tenantId, originalId);
  if (!original) return null;
  if (original.status !== 'denied' && original.status !== 'rejected') {
    throw new Error(`Cannot resubmit claim in status: ${original.status}`);
  }

  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resubCount = original.resubmissionCount + 1;

  const auditEntry = [
    {
      timestamp: now,
      action: 'draft.resubmission_created',
      actor,
      detail: `Resubmission #${resubCount} of claim ${originalId}`,
    },
  ];

  await db.insert(claimDraft).values({
    id,
    tenantId,
    idempotencyKey: null,
    status: 'draft',
    claimType: original.claimType,
    encounterId: original.encounterId,
    patientId: overrides?.patientId || original.patientId,
    patientName: overrides?.patientName || original.patientName,
    providerId: overrides?.providerId || original.providerId,
    billingProviderId: overrides?.billingProviderId || original.billingProviderId,
    payerId: overrides?.payerId || original.payerId,
    payerName: overrides?.payerName || original.payerName,
    dateOfService: original.dateOfService,
    diagnosesJson: JSON.stringify(overrides?.diagnoses || original.diagnoses),
    linesJson: JSON.stringify(overrides?.lines || original.lines),
    attachmentsJson: JSON.stringify(overrides?.attachments || original.attachments),
    totalChargeCents: overrides?.totalChargeCents ?? original.totalChargeCents,
    resubmissionOf: originalId,
    resubmissionCount: resubCount,
    vistaChargeIen: original.vistaChargeIen,
    vistaArIen: original.vistaArIen,
    metadataJson: JSON.stringify(overrides?.metadata || original.metadata),
    auditJson: JSON.stringify(auditEntry),
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
  });

  // Transition original to appealed
  await transitionClaimDraft(tenantId, originalId, 'appealed', actor, {
    reason: `Resubmitted as ${id}`,
  });

  // Record lifecycle event on new draft
  await recordLifecycleEvent(tenantId, id, null, 'draft', actor, `Resubmission of ${originalId}`);

  return getClaimDraftById(tenantId, id);
}

export async function setAppealPacket(
  tenantId: string,
  id: string,
  appealPacketRef: string,
  actor: string
): Promise<ClaimDraftRow | null> {
  const existing = await getClaimDraftById(tenantId, id);
  if (!existing) return null;

  const db = getPgDb();
  const now = new Date().toISOString();
  const auditEntry = {
    timestamp: now,
    action: 'draft.appeal_packet_set',
    actor,
    detail: `Appeal packet: ${appealPacketRef}`,
  };
  const auditTrail = [...existing.audit, auditEntry];

  await db
    .update(claimDraft)
    .set({
      appealPacketRef,
      updatedAt: now,
      auditJson: JSON.stringify(auditTrail),
    })
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)));

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Scrub Score Update                                                  */
/* ------------------------------------------------------------------ */

export async function updateScrubScore(tenantId: string, id: string, score: number): Promise<void> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(claimDraft)
    .set({ scrubScore: score, lastScrubAt: now, updatedAt: now })
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)));
}

/* ------------------------------------------------------------------ */
/* Lifecycle Events                                                    */
/* ------------------------------------------------------------------ */

async function recordLifecycleEvent(
  tenantId: string,
  claimDraftId: string,
  fromStatus: string | null,
  toStatus: string,
  actor: string,
  reason?: string,
  denialCode?: string,
  resubmissionRef?: string
): Promise<void> {
  const db = getPgDb();
  await db.insert(claimLifecycleEvent).values({
    id: randomUUID(),
    claimDraftId,
    tenantId,
    fromStatus: fromStatus || null,
    toStatus,
    actor,
    reason: reason || null,
    denialCode: denialCode || null,
    resubmissionRef: resubmissionRef || null,
    detailJson: '{}',
    occurredAt: new Date().toISOString(),
  });
}

export async function getLifecycleEvents(
  tenantId: string,
  claimDraftId: string
): Promise<ClaimLifecycleEventRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(claimLifecycleEvent)
    .where(
      and(
        eq(claimLifecycleEvent.tenantId, tenantId),
        eq(claimLifecycleEvent.claimDraftId, claimDraftId)
      )
    )
    .orderBy(claimLifecycleEvent.occurredAt);
  return rows.map(parseEvent);
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export async function getClaimDraftStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  deniedCount: number;
  avgScrubScore: number | null;
  totalChargeCents: number;
  totalPaidCents: number;
}> {
  const db = getPgDb();

  const totalRows = await db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId));
  const total = (totalRows[0] as any)?.cnt ?? 0;

  // Group by status
  const statusRows = await db
    .select({
      status: claimDraft.status,
      cnt: count(),
    })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId))
    .groupBy(claimDraft.status);
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) {
    byStatus[(r as any).status] = (r as any).cnt;
  }

  const deniedCount = byStatus['denied'] ?? 0;

  // Avg scrub score
  const avgRows = await db
    .select({ avg: sql<number>`AVG(scrub_score)` })
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), sql`scrub_score IS NOT NULL`));
  const avgScrubScore = (avgRows[0] as any)?.avg ?? null;

  // Totals
  const sumRows = await db
    .select({
      totalCharge: sql<number>`COALESCE(SUM(total_charge_cents), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(paid_amount_cents), 0)`,
    })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId));
  const sumRow = sumRows[0];

  return {
    total,
    byStatus,
    deniedCount,
    avgScrubScore: avgScrubScore !== null ? Math.round(avgScrubScore) : null,
    totalChargeCents: (sumRow as any)?.totalCharge ?? 0,
    totalPaidCents: (sumRow as any)?.totalPaid ?? 0,
  };
}

/**
 * Aging report: claims in denied/rejected status for > N days.
 */
export async function getAgingDenials(
  tenantId: string,
  olderThanDays: number = 30
): Promise<ClaimDraftRow[]> {
  const db = getPgDb();
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  const rows = await db
    .select()
    .from(claimDraft)
    .where(
      and(
        eq(claimDraft.tenantId, tenantId),
        sql`status IN ('denied', 'rejected')`,
        lte(claimDraft.deniedAt, cutoff)
      )
    )
    .orderBy(claimDraft.deniedAt);
  return rows.map(parseDraft);
}

export async function countClaimDrafts(tenantId: string): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId));
  return (rows[0] as any)?.cnt ?? 0;
}
