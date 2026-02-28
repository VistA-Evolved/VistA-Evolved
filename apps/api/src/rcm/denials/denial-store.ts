/**
 * Denial Store — PG Drizzle Persistence
 *
 * CRUD operations for denial_case, denial_action, denial_attachment,
 * and resubmission_attempt tables using PG.
 *
 * All amounts stored in cents. Dates as ISO 8601 strings.
 * Patient DFN is stored but NEVER included in audit or logs.
 */

import { randomUUID } from "node:crypto";
import { getPgDb } from "../../platform/pg/pg-db.js";
import { denialCase, denialAction, denialAttachment, resubmissionAttempt } from "../../platform/pg/pg-schema.js";
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

export async function createDenialCase(input: CreateDenialInput, actor?: string): Promise<DenialCase> {
  const db = getPgDb();
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
    receivedDate: new Date(input.receivedDate ?? now),
    deadlineDate: input.deadlineDate ? new Date(input.deadlineDate) : null,
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
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  await db.insert(denialCase).values(row);

  // Record initial action
  await insertAction(id, actor ?? "system", "NOTE", {}, null, "NEW");

  return rowToDenialCase(row);
}

/**
 * Create a denial case with import provenance (used by EDI 835 import).
 * Sets importFileHash, importTimestamp, importParserVersion at creation time.
 */
export async function createDenialCaseWithProvenance(
  input: CreateDenialInput,
  provenance: {
    importFileHash: string;
    importTimestamp: string;
    importParserVersion: string;
  },
  actor?: string,
): Promise<DenialCase> {
  const db = getPgDb();
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
    receivedDate: new Date(input.receivedDate ?? now),
    deadlineDate: input.deadlineDate ? new Date(input.deadlineDate) : null,
    assignedTo: input.assignedTo ?? null,
    assignedTeam: input.assignedTeam ?? null,
    billedAmountCents: toCents(input.billedAmount) ?? 0,
    allowedAmountCents: toCents(input.allowedAmount) ?? null,
    paidAmountCents: toCents(input.paidAmount) ?? null,
    patientRespCents: toCents(input.patientResp) ?? null,
    adjustmentAmountCents: toCents(input.adjustmentAmount) ?? null,
    evidenceRefsJson: "[]",
    importFileHash: provenance.importFileHash,
    importTimestamp: new Date(provenance.importTimestamp),
    importParserVersion: provenance.importParserVersion,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  await db.insert(denialCase).values(row);

  // Record initial action
  await insertAction(id, actor ?? "system", "IMPORT", {
    source: input.denialSource ?? "EDI_835",
    importFileHash: provenance.importFileHash,
  }, null, "NEW");

  return rowToDenialCase(row);
}

export async function getDenialById(id: string): Promise<DenialCase | null> {
  const db = getPgDb();
  const rows = await db.select().from(denialCase).where(eq(denialCase.id, id));
  return rows[0] ? rowToDenialCase(rows[0]) : null;
}

export async function updateDenialCase(
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
): Promise<DenialCase | null> {
  const db = getPgDb();
  const existing = await getDenialById(id);
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

  await db.update(denialCase).set(setClause).where(eq(denialCase.id, id));

  // Record action
  const actionType = updates.denialStatus && updates.denialStatus !== previousStatus
    ? "STATUS_CHANGE" : "NOTE";
  await insertAction(id, actor, actionType, { reason, changes: Object.keys(setClause) }, previousStatus, newStatus);

  return getDenialById(id);
}

export interface DenialListResult {
  items: DenialCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listDenials(query: DenialListQuery): Promise<DenialListResult> {
  const db = getPgDb();
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
    conditions.push(lte(denialCase.deadlineDate, future));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total
  const countRows = await db.select({ count: sql<number>`count(*)` })
    .from(denialCase)
    .where(whereClause);
  const total = (countRows[0] as any)?.count ?? 0;

  // Determine sort column
  const sortCol = query.sort === "deadlineDate" ? denialCase.deadlineDate
    : query.sort === "billedAmount" ? denialCase.billedAmountCents
    : query.sort === "updatedAt" ? denialCase.updatedAt
    : denialCase.createdAt;
  const orderFn = query.order === "asc" ? asc : desc;

  // Paginated query
  const offset = (query.page - 1) * query.limit;
  const rows = await db.select().from(denialCase)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset);

  return {
    items: rows.map(rowToDenialCase),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

/* ── Denial Actions ─────────────────────────────────────────── */

async function insertAction(
  denialId: string,
  actor: string,
  actionType: string,
  payload: Record<string, unknown>,
  previousStatus: DenialStatus | null,
  newStatus: DenialStatus | null,
): Promise<DenialAction> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    actor,
    timestamp: new Date(now),
    actionType,
    payloadJson: JSON.stringify(payload),
    previousStatus: previousStatus ?? null,
    newStatus: newStatus ?? null,
  };

  await db.insert(denialAction).values(row);
  return rowToAction(row);
}

export async function addDenialAction(
  denialId: string,
  actor: string,
  actionType: string,
  payload: Record<string, unknown>,
): Promise<DenialAction> {
  const existing = await getDenialById(denialId);
  if (!existing) throw new Error(`Denial not found: ${denialId}`);
  return insertAction(denialId, actor, actionType, payload, existing.denialStatus, existing.denialStatus);
}

export async function listDenialActions(denialId: string): Promise<DenialAction[]> {
  const db = getPgDb();
  const rows = await db.select().from(denialAction)
    .where(eq(denialAction.denialId, denialId))
    .orderBy(asc(denialAction.timestamp));
  return rows.map(rowToAction);
}

/* ── Attachments ────────────────────────────────────────────── */

export async function addAttachment(
  denialId: string,
  label: string,
  refType: string,
  storedPath: string | null,
  sha256: string | null,
  actor: string,
): Promise<DenialAttachment> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    label,
    refType,
    storedPath: storedPath ?? null,
    sha256: sha256 ?? null,
    addedAt: new Date(now),
    addedBy: actor,
  };

  await db.insert(denialAttachment).values(row);
  return rowToAttachment(row);
}

export async function listAttachments(denialId: string): Promise<DenialAttachment[]> {
  const db = getPgDb();
  const rows = await db.select().from(denialAttachment)
    .where(eq(denialAttachment.denialId, denialId))
    .orderBy(asc(denialAttachment.addedAt));
  return rows.map(rowToAttachment);
}

/* ── Resubmission Attempts ──────────────────────────────────── */

export async function createResubmission(
  denialId: string,
  method: string,
  referenceNumber: string | null,
  followUpDate: string | null,
  notes: string | null,
  actor: string,
): Promise<ResubmissionAttempt> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    denialId,
    createdAt: new Date(now),
    method,
    referenceNumber: referenceNumber ?? null,
    followUpDate: followUpDate ? new Date(followUpDate) : null,
    notes: notes ?? null,
    actor,
  };

  await db.insert(resubmissionAttempt).values(row);

  // Record action
  await insertAction(denialId, actor, "SUBMIT_APPEAL", { method, referenceNumber }, null, null);

  return rowToResubmission(row);
}

export async function listResubmissions(denialId: string): Promise<ResubmissionAttempt[]> {
  const db = getPgDb();
  const rows = await db.select().from(resubmissionAttempt)
    .where(eq(resubmissionAttempt.denialId, denialId))
    .orderBy(desc(resubmissionAttempt.createdAt));
  return rows.map(rowToResubmission);
}

/* ── Stats (for dashboard) ──────────────────────────────────── */

export async function getDenialStats(): Promise<Record<string, number>> {
  const db = getPgDb();
  const rows = await db.select({
    status: denialCase.denialStatus,
    count: sql<number>`count(*)`,
  }).from(denialCase).groupBy(denialCase.denialStatus);

  const stats: Record<string, number> = {};
  for (const row of rows) {
    stats[row.status] = (row as any).count;
  }
  return stats;
}
