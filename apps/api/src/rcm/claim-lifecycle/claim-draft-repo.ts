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

import { randomUUID } from "node:crypto";
import { eq, and, desc, count, lte, gte, sql } from "drizzle-orm";
import { getDb } from "../../platform/db/db.js";
import {
  claimDraft,
  claimLifecycleEvent,
} from "../../platform/db/schema.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ClaimDraftStatus =
  | "draft"
  | "scrubbed"
  | "ready"
  | "submitted"
  | "accepted"
  | "rejected"
  | "paid"
  | "denied"
  | "appealed"
  | "closed";

export const VALID_TRANSITIONS: Record<ClaimDraftStatus, ClaimDraftStatus[]> = {
  draft:     ["scrubbed", "closed"],
  scrubbed:  ["ready", "draft", "closed"],
  ready:     ["submitted", "scrubbed", "draft", "closed"],
  submitted: ["accepted", "rejected", "closed"],
  accepted:  ["paid", "denied", "closed"],
  rejected:  ["draft", "appealed", "closed"],
  paid:      ["closed"],
  denied:    ["appealed", "closed"],
  appealed:  ["accepted", "rejected", "paid", "denied", "closed"],
  closed:    [],
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
  tenantId?: string;
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
  try { return JSON.parse(val); } catch { return fallback; }
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

export function createClaimDraft(input: CreateClaimDraftInput): ClaimDraftRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  // Idempotency check: if key provided and already exists, return existing
  if (input.idempotencyKey) {
    const existing = db
      .select()
      .from(claimDraft)
      .where(and(
        eq(claimDraft.tenantId, tenantId),
        eq(claimDraft.idempotencyKey, input.idempotencyKey),
      ))
      .get();
    if (existing) return parseDraft(existing);
  }

  const lines = input.lines ?? [];
  const totalCharge = input.totalChargeCents ??
    lines.reduce((sum: number, l: any) => sum + (l.procedure?.charge ?? l.chargeAmount ?? 0), 0);

  const auditEntry = [{
    timestamp: now,
    action: "draft.created",
    actor: input.createdBy,
    toStatus: "draft",
    detail: "Claim draft created",
  }];

  db.insert(claimDraft)
    .values({
      id,
      tenantId,
      idempotencyKey: input.idempotencyKey || null,
      status: "draft",
      claimType: input.claimType || "professional",
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
    })
    .run();

  // Record lifecycle event
  recordLifecycleEvent(tenantId, id, null, "draft", input.createdBy, "Claim draft created");

  return getClaimDraftById(tenantId, id)!;
}

export function getClaimDraftById(tenantId: string, id: string): ClaimDraftRow | null {
  const db = getDb();
  const row = db
    .select()
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)))
    .get();
  return row ? parseDraft(row) : null;
}

export function listClaimDrafts(
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
  offset: number = 0,
): ClaimDraftRow[] {
  const db = getDb();
  const conditions = [eq(claimDraft.tenantId, tenantId)];
  if (filters?.status) conditions.push(eq(claimDraft.status, filters.status));
  if (filters?.payerId) conditions.push(eq(claimDraft.payerId, filters.payerId));
  if (filters?.patientId) conditions.push(eq(claimDraft.patientId, filters.patientId));
  if (filters?.encounterId) conditions.push(eq(claimDraft.encounterId, filters.encounterId));
  if (filters?.dateFrom) conditions.push(gte(claimDraft.dateOfService, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(claimDraft.dateOfService, filters.dateTo));

  return db
    .select()
    .from(claimDraft)
    .where(and(...conditions))
    .orderBy(desc(claimDraft.updatedAt))
    .limit(limit)
    .offset(offset)
    .all()
    .map(parseDraft);
}

export function updateClaimDraft(
  tenantId: string,
  id: string,
  updates: Partial<Pick<CreateClaimDraftInput,
    "patientName" | "providerId" | "billingProviderId" | "payerName" |
    "diagnoses" | "lines" | "attachments" | "totalChargeCents" | "metadata"
  >>,
  actor: string,
): ClaimDraftRow | null {
  const db = getDb();
  const existing = getClaimDraftById(tenantId, id);
  if (!existing) return null;
  if (existing.status !== "draft" && existing.status !== "scrubbed") {
    throw new Error(`Cannot update claim in status: ${existing.status}`);
  }

  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.patientName !== undefined) setClause.patientName = updates.patientName;
  if (updates.providerId !== undefined) setClause.providerId = updates.providerId;
  if (updates.billingProviderId !== undefined) setClause.billingProviderId = updates.billingProviderId;
  if (updates.payerName !== undefined) setClause.payerName = updates.payerName;
  if (updates.diagnoses !== undefined) setClause.diagnosesJson = JSON.stringify(updates.diagnoses);
  if (updates.lines !== undefined) {
    setClause.linesJson = JSON.stringify(updates.lines);
    if (updates.totalChargeCents === undefined) {
      setClause.totalChargeCents = updates.lines.reduce(
        (sum: number, l: any) => sum + (l.procedure?.charge ?? l.chargeAmount ?? 0), 0
      );
    }
  }
  if (updates.attachments !== undefined) setClause.attachmentsJson = JSON.stringify(updates.attachments);
  if (updates.totalChargeCents !== undefined) setClause.totalChargeCents = updates.totalChargeCents;
  if (updates.metadata !== undefined) setClause.metadataJson = JSON.stringify(updates.metadata);

  // Append audit entry
  const auditEntry = { timestamp: now, action: "draft.updated", actor, detail: "Claim draft updated" };
  const auditTrail = [...existing.audit, auditEntry];
  setClause.auditJson = JSON.stringify(auditTrail);

  db.update(claimDraft)
    .set(setClause)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)))
    .run();

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Status Transitions                                                  */
/* ------------------------------------------------------------------ */

export function transitionClaimDraft(
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
  },
): ClaimDraftRow | null {
  const existing = getClaimDraftById(tenantId, id);
  if (!existing) return null;

  if (!isValidDraftTransition(existing.status, toStatus)) {
    throw new Error(`Invalid transition: ${existing.status} -> ${toStatus}`);
  }

  const db = getDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { status: toStatus, updatedAt: now };

  // Status-specific fields
  if (toStatus === "submitted") setClause.submittedAt = now;
  if (toStatus === "paid") {
    setClause.paidAt = now;
    if (opts?.paidAmountCents !== undefined) setClause.paidAmountCents = opts.paidAmountCents;
    if (opts?.adjustmentCents !== undefined) setClause.adjustmentCents = opts.adjustmentCents;
    if (opts?.patientRespCents !== undefined) setClause.patientRespCents = opts.patientRespCents;
  }
  if (toStatus === "denied") {
    setClause.deniedAt = now;
    if (opts?.denialCode) setClause.denialCode = opts.denialCode;
    if (opts?.reason) setClause.denialReason = opts.reason;
  }
  if (toStatus === "closed") setClause.closedAt = now;

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

  db.update(claimDraft)
    .set(setClause)
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)))
    .run();

  // Record lifecycle event
  recordLifecycleEvent(tenantId, id, existing.status, toStatus, actor, opts?.reason, opts?.denialCode);

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Denial + Resubmission                                               */
/* ------------------------------------------------------------------ */

export function recordDenial(
  tenantId: string,
  id: string,
  denialCode: string,
  denialReason: string,
  actor: string,
): ClaimDraftRow | null {
  return transitionClaimDraft(tenantId, id, "denied", actor, {
    denialCode,
    reason: denialReason,
  });
}

/**
 * Create a resubmission claim draft from a denied/rejected original.
 * Links back via resubmissionOf and increments resubmissionCount.
 */
export function createResubmission(
  tenantId: string,
  originalId: string,
  actor: string,
  overrides?: Partial<CreateClaimDraftInput>,
): ClaimDraftRow | null {
  const original = getClaimDraftById(tenantId, originalId);
  if (!original) return null;
  if (original.status !== "denied" && original.status !== "rejected") {
    throw new Error(`Cannot resubmit claim in status: ${original.status}`);
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const resubCount = original.resubmissionCount + 1;

  const auditEntry = [{
    timestamp: now,
    action: "draft.resubmission_created",
    actor,
    detail: `Resubmission #${resubCount} of claim ${originalId}`,
  }];

  db.insert(claimDraft)
    .values({
      id,
      tenantId,
      idempotencyKey: null,
      status: "draft",
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
    })
    .run();

  // Transition original to appealed
  transitionClaimDraft(tenantId, originalId, "appealed", actor, {
    reason: `Resubmitted as ${id}`,
  });

  // Record lifecycle event on new draft
  recordLifecycleEvent(tenantId, id, null, "draft", actor, `Resubmission of ${originalId}`);

  return getClaimDraftById(tenantId, id);
}

export function setAppealPacket(
  tenantId: string,
  id: string,
  appealPacketRef: string,
  actor: string,
): ClaimDraftRow | null {
  const existing = getClaimDraftById(tenantId, id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();
  const auditEntry = {
    timestamp: now,
    action: "draft.appeal_packet_set",
    actor,
    detail: `Appeal packet: ${appealPacketRef}`,
  };
  const auditTrail = [...existing.audit, auditEntry];

  db.update(claimDraft)
    .set({
      appealPacketRef,
      updatedAt: now,
      auditJson: JSON.stringify(auditTrail),
    })
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)))
    .run();

  return getClaimDraftById(tenantId, id);
}

/* ------------------------------------------------------------------ */
/* Scrub Score Update                                                  */
/* ------------------------------------------------------------------ */

export function updateScrubScore(
  tenantId: string,
  id: string,
  score: number,
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(claimDraft)
    .set({ scrubScore: score, lastScrubAt: now, updatedAt: now })
    .where(and(eq(claimDraft.tenantId, tenantId), eq(claimDraft.id, id)))
    .run();
}

/* ------------------------------------------------------------------ */
/* Lifecycle Events                                                    */
/* ------------------------------------------------------------------ */

function recordLifecycleEvent(
  tenantId: string,
  claimDraftId: string,
  fromStatus: string | null,
  toStatus: string,
  actor: string,
  reason?: string,
  denialCode?: string,
  resubmissionRef?: string,
): void {
  const db = getDb();
  db.insert(claimLifecycleEvent)
    .values({
      id: randomUUID(),
      claimDraftId,
      tenantId,
      fromStatus: fromStatus || null,
      toStatus,
      actor,
      reason: reason || null,
      denialCode: denialCode || null,
      resubmissionRef: resubmissionRef || null,
      detailJson: "{}",
      occurredAt: new Date().toISOString(),
    })
    .run();
}

export function getLifecycleEvents(
  tenantId: string,
  claimDraftId: string,
): ClaimLifecycleEventRow[] {
  const db = getDb();
  return db
    .select()
    .from(claimLifecycleEvent)
    .where(and(
      eq(claimLifecycleEvent.tenantId, tenantId),
      eq(claimLifecycleEvent.claimDraftId, claimDraftId),
    ))
    .orderBy(claimLifecycleEvent.occurredAt)
    .all()
    .map(parseEvent);
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function getClaimDraftStats(tenantId: string): {
  total: number;
  byStatus: Record<string, number>;
  deniedCount: number;
  avgScrubScore: number | null;
  totalChargeCents: number;
  totalPaidCents: number;
} {
  const db = getDb();

  const totalResult = db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId))
    .get();
  const total = (totalResult as any)?.cnt ?? 0;

  // Group by status
  const statusRows = db
    .select({
      status: claimDraft.status,
      cnt: count(),
    })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId))
    .groupBy(claimDraft.status)
    .all();
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) {
    byStatus[(r as any).status] = (r as any).cnt;
  }

  const deniedCount = byStatus["denied"] ?? 0;

  // Avg scrub score
  const avgRow = db
    .select({ avg: sql<number>`AVG(scrub_score)` })
    .from(claimDraft)
    .where(and(
      eq(claimDraft.tenantId, tenantId),
      sql`scrub_score IS NOT NULL`,
    ))
    .get();
  const avgScrubScore = (avgRow as any)?.avg ?? null;

  // Totals
  const sumRow = db
    .select({
      totalCharge: sql<number>`COALESCE(SUM(total_charge_cents), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(paid_amount_cents), 0)`,
    })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId))
    .get();

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
export function getAgingDenials(tenantId: string, olderThanDays: number = 30): ClaimDraftRow[] {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  return db
    .select()
    .from(claimDraft)
    .where(and(
      eq(claimDraft.tenantId, tenantId),
      sql`status IN ('denied', 'rejected')`,
      lte(claimDraft.deniedAt, cutoff),
    ))
    .orderBy(claimDraft.deniedAt)
    .all()
    .map(parseDraft);
}

export function countClaimDrafts(tenantId: string): number {
  const db = getDb();
  const result = db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(eq(claimDraft.tenantId, tenantId))
    .get();
  return (result as any)?.cnt ?? 0;
}
