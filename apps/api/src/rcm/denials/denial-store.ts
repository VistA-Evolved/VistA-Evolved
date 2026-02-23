/**
 * Denial Store — Phase 98: Durable SQLite Persistence
 *
 * CRUD operations for denial_case, denial_action, denial_attachment,
 * and resubmission_attempt tables using the platform DB.
 *
 * All amounts stored in cents. Dates as ISO 8601 strings.
 * Patient DFN is stored but NEVER included in audit or logs.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../../platform/db/db.js";
import { denialCase, denialAction, denialAttachment, resubmissionAttempt } from "../../platform/db/schema.js";
import { eq, desc, asc, and, sql, lte, gte } from "drizzle-orm";
import type {
  DenialCase,
  DenialAction,
  DenialAttachment,
  ResubmissionAttempt,
  DenialStatus,
  DenialListQuery,
  CreateDenialInput,
  DenialFinancials,
  DenialCode,
  EvidenceRef,
} from "./types.js";

/* ── Helpers ────────────────────────────────────────────────── */

function toCents(dollars: number | undefined): number | undefined {
  if (dollars === undefined) return undefined;
  return Math.round(dollars * 100);
}

function rowToDenialCase(row: any): DenialCase {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    claimRef: row.claimRef,
    vistaClaimIen: row.vistaClaimIen ?? null,
    patientDfn: row.patientDfn ?? null,
    payerId: row.payerId,
    denialStatus: row.denialStatus as DenialStatus,
    denialSource: row.denialSource as any,
    denialCodes: safeJsonParse(row.denialCodesJson, []),
    denialNarrative: row.denialNarrative ?? null,
    receivedDate: row.receivedDate,
    deadlineDate: row.deadlineDate ?? null,
    assignedTo: row.assignedTo ?? null,
    assignedTeam: row.assignedTeam ?? null,
    financials: {
      billedAmountCents: row.billedAmountCents ?? 0,
      allowedAmountCents: row.allowedAmountCents ?? undefined,
      paidAmountCents: row.paidAmountCents ?? undefined,
      patientRespCents: row.patientRespCents ?? undefined,
      adjustmentAmountCents: row.adjustmentAmountCents ?? undefined,
    },
    evidenceRefs: safeJsonParse(row.evidenceRefsJson, []),
    importFileHash: row.importFileHash ?? null,
    importTimestamp: row.importTimestamp ?? null,
    importParserVersion: row.importParserVersion ?? null,
  };
}

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function rowToAction(row: any): DenialAction {
  return {
    id: row.id,
    denialId: row.denialId,
    actor: row.actor,
    timestamp: row.timestamp,
    actionType: row.actionType as any,
    payload: safeJsonParse(row.payloadJson, {}),
    previousStatus: row.previousStatus as DenialStatus | null,
    newStatus: row.newStatus as DenialStatus | null,
  };
}

function rowToAttachment(row: any): DenialAttachment {
  return {
    id: row.id,
    denialId: row.denialId,
    label: row.label,
    refType: row.refType,
    storedPath: row.storedPath ?? null,
    sha256: row.sha256 ?? null,
    addedAt: row.addedAt,
    addedBy: row.addedBy ?? null,
  };
}

function rowToResubmission(row: any): ResubmissionAttempt {
  return {
    id: row.id,
    denialId: row.denialId,
    createdAt: row.createdAt,
    method: row.method as any,
    referenceNumber: row.referenceNumber ?? null,
    followUpDate: row.followUpDate ?? null,
    notes: row.notes ?? null,
    actor: row.actor,
  };
}

/* ── Denial Case CRUD ───────────────────────────────────────── */

export function createDenialCase(input: CreateDenialInput, actor?: string): DenialCase {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    claimRef: input.claimRef,
    vistaClaimIen: input.vistaClaimIen ?? null,
    patientDfn: input.patientDfn ?? null,
    payerId: input.payerId,
    denialStatus: "NEW" as const,
    denialSource: input.denialSource ?? "MANUAL",
    denialCodesJson: JSON.stringify(input.denialCodes ?? []),
    denialNarrative: input.denialNarrative ?? null,
    receivedDate: input.receivedDate ?? now,
    deadlineDate: input.deadlineDate ?? null,
    assignedTo: input.assignedTo ?? null,
    assignedTeam: input.assignedTeam ?? null,
    billedAmountCents: toCents(input.billedAmount) ?? 0,
    allowedAmountCents: toCents(input.allowedAmount) ?? null,
    paidAmountCents: toCents(input.paidAmount) ?? null,
    patientRespCents: toCents(input.patientResp) ?? null,
    adjustmentAmountCents: toCents(input.adjustmentAmount) ?? null,
    evidenceRefsJson: "[]",
    importFileHash: null,
    importTimestamp: null,
    importParserVersion: null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(denialCase).values(row).run();

  // Record initial action
  insertAction(id, actor ?? "system", "NOTE", {}, null, "NEW");

  return rowToDenialCase(row);
}

/**
 * Create a denial case with import provenance (used by EDI 835 import).
 * Sets importFileHash, importTimestamp, importParserVersion at creation time.
 */
export function createDenialCaseWithProvenance(
  input: CreateDenialInput,
  provenance: {
    importFileHash: string;
    importTimestamp: string;
    importParserVersion: string;
  },
  actor?: string,
): DenialCase {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    claimRef: input.claimRef,
    vistaClaimIen: input.vistaClaimIen ?? null,
    patientDfn: input.patientDfn ?? null,
    payerId: input.payerId,
    denialStatus: "NEW" as const,
    denialSource: input.denialSource ?? "EDI_835",
    denialCodesJson: JSON.stringify(input.denialCodes ?? []),
    denialNarrative: input.denialNarrative ?? null,
    receivedDate: input.receivedDate ?? now,
    deadlineDate: input.deadlineDate ?? null,
    assignedTo: input.assignedTo ?? null,
    assignedTeam: input.assignedTeam ?? null,
    billedAmountCents: toCents(input.billedAmount) ?? 0,
    allowedAmountCents: toCents(input.allowedAmount) ?? null,
    paidAmountCents: toCents(input.paidAmount) ?? null,
    patientRespCents: toCents(input.patientResp) ?? null,
    adjustmentAmountCents: toCents(input.adjustmentAmount) ?? null,
    evidenceRefsJson: "[]",
    importFileHash: provenance.importFileHash,
    importTimestamp: provenance.importTimestamp,
    importParserVersion: provenance.importParserVersion,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(denialCase).values(row).run();

  // Record initial action
  insertAction(id, actor ?? "system", "IMPORT", {
    source: input.denialSource ?? "EDI_835",
    importFileHash: provenance.importFileHash,
  }, null, "NEW");

  return rowToDenialCase(row);
}

export function getDenialById(id: string): DenialCase | null {
  const db = getDb();
  const row = db.select().from(denialCase).where(eq(denialCase.id, id)).get();
  return row ? rowToDenialCase(row) : null;
}

export function updateDenialCase(
  id: string,
  updates: {
    denialStatus?: DenialStatus;
    denialNarrative?: string;
    deadlineDate?: string;
    assignedTo?: string;
    assignedTeam?: string;
    denialCodes?: DenialCode[];
  },
  actor: string,
  reason: string,
): DenialCase | null {
  const db = getDb();
  const existing = getDenialById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const previousStatus = existing.denialStatus;
  const newStatus = updates.denialStatus ?? existing.denialStatus;

  const setClause: Record<string, any> = { updatedAt: now };
  if (updates.denialStatus) setClause.denialStatus = updates.denialStatus;
  if (updates.denialNarrative !== undefined) setClause.denialNarrative = updates.denialNarrative;
  if (updates.deadlineDate !== undefined) setClause.deadlineDate = updates.deadlineDate;
  if (updates.assignedTo !== undefined) setClause.assignedTo = updates.assignedTo;
  if (updates.assignedTeam !== undefined) setClause.assignedTeam = updates.assignedTeam;
  if (updates.denialCodes) setClause.denialCodesJson = JSON.stringify(updates.denialCodes);

  db.update(denialCase).set(setClause).where(eq(denialCase.id, id)).run();

  // Record action
  const actionType = updates.denialStatus && updates.denialStatus !== previousStatus
    ? "STATUS_CHANGE" : "NOTE";
  insertAction(id, actor, actionType, { reason, changes: Object.keys(setClause) }, previousStatus, newStatus);

  return getDenialById(id);
}

export interface DenialListResult {
  items: DenialCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function listDenials(query: DenialListQuery): DenialListResult {
  const db = getDb();
  const conditions: any[] = [];

  if (query.status) conditions.push(eq(denialCase.denialStatus, query.status));
  if (query.payerId) conditions.push(eq(denialCase.payerId, query.payerId));
  if (query.assignedTo) conditions.push(eq(denialCase.assignedTo, query.assignedTo));
  if (query.minAmount !== undefined) {
    conditions.push(gte(denialCase.billedAmountCents, Math.round(query.minAmount * 100)));
  }
  if (query.maxAmount !== undefined) {
    conditions.push(lte(denialCase.billedAmountCents, Math.round(query.maxAmount * 100)));
  }
  if (query.slaDueWithinDays !== undefined) {
    const future = new Date();
    future.setDate(future.getDate() + query.slaDueWithinDays);
    conditions.push(lte(denialCase.deadlineDate, future.toISOString()));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(denialCase)
    .where(whereClause)
    .get();
  const total = (countResult as any)?.count ?? 0;

  // Determine sort column
  const sortCol = query.sort === "deadlineDate" ? denialCase.deadlineDate
    : query.sort === "billedAmount" ? denialCase.billedAmountCents
    : query.sort === "updatedAt" ? denialCase.updatedAt
    : denialCase.createdAt;
  const orderFn = query.order === "asc" ? asc : desc;

  // Paginated query
  const offset = (query.page - 1) * query.limit;
  const rows = db.select().from(denialCase)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset)
    .all();

  return {
    items: rows.map(rowToDenialCase),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

/* ── Denial Actions ─────────────────────────────────────────── */

function insertAction(
  denialId: string,
  actor: string,
  actionType: string,
  payload: Record<string, unknown>,
  previousStatus: DenialStatus | null,
  newStatus: DenialStatus | null,
): DenialAction {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    actor,
    timestamp: now,
    actionType,
    payloadJson: JSON.stringify(payload),
    previousStatus: previousStatus ?? null,
    newStatus: newStatus ?? null,
  };

  db.insert(denialAction).values(row).run();
  return rowToAction(row);
}

export function addDenialAction(
  denialId: string,
  actor: string,
  actionType: string,
  payload: Record<string, unknown>,
): DenialAction {
  const existing = getDenialById(denialId);
  if (!existing) throw new Error(`Denial not found: ${denialId}`);
  return insertAction(denialId, actor, actionType, payload, existing.denialStatus, existing.denialStatus);
}

export function listDenialActions(denialId: string): DenialAction[] {
  const db = getDb();
  const rows = db.select().from(denialAction)
    .where(eq(denialAction.denialId, denialId))
    .orderBy(asc(denialAction.timestamp))
    .all();
  return rows.map(rowToAction);
}

/* ── Attachments ────────────────────────────────────────────── */

export function addAttachment(
  denialId: string,
  label: string,
  refType: string,
  storedPath: string | null,
  sha256: string | null,
  actor: string,
): DenialAttachment {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    label,
    refType,
    storedPath: storedPath ?? null,
    sha256: sha256 ?? null,
    addedAt: now,
    addedBy: actor,
  };

  db.insert(denialAttachment).values(row).run();
  return rowToAttachment(row);
}

export function listAttachments(denialId: string): DenialAttachment[] {
  const db = getDb();
  return db.select().from(denialAttachment)
    .where(eq(denialAttachment.denialId, denialId))
    .orderBy(asc(denialAttachment.addedAt))
    .all()
    .map(rowToAttachment);
}

/* ── Resubmission Attempts ──────────────────────────────────── */

export function createResubmission(
  denialId: string,
  method: string,
  referenceNumber: string | null,
  followUpDate: string | null,
  notes: string | null,
  actor: string,
): ResubmissionAttempt {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    createdAt: now,
    method,
    referenceNumber: referenceNumber ?? null,
    followUpDate: followUpDate ?? null,
    notes: notes ?? null,
    actor,
  };

  db.insert(resubmissionAttempt).values(row).run();

  // Record action
  insertAction(denialId, actor, "SUBMIT_APPEAL", { method, referenceNumber }, null, null);

  return rowToResubmission(row);
}

export function listResubmissions(denialId: string): ResubmissionAttempt[] {
  const db = getDb();
  return db.select().from(resubmissionAttempt)
    .where(eq(resubmissionAttempt.denialId, denialId))
    .orderBy(desc(resubmissionAttempt.createdAt))
    .all()
    .map(rowToResubmission);
}

/* ── Stats (for dashboard) ──────────────────────────────────── */

export function getDenialStats(): Record<string, number> {
  const db = getDb();
  const rows = db.select({
    status: denialCase.denialStatus,
    count: sql<number>`count(*)`,
  }).from(denialCase).groupBy(denialCase.denialStatus).all();

  const stats: Record<string, number> = {};
  for (const row of rows) {
    stats[row.status] = (row as any).count;
  }
  return stats;
}
