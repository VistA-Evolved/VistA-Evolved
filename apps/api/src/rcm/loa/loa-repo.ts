/**
 * LOA (Letter of Authorization) Repository -- Phase 110
 *
 * CRUD for loa_request and loa_attachment tables.
 * All operations are tenant-scoped.
 */

import { eq, and, desc, count } from "drizzle-orm";
import { getPgDb } from "../../platform/pg/pg-db.js";
import { loaRequest, loaAttachment } from "../../platform/pg/pg-schema.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface LoaRequestRow {
  id: string;
  tenantId: string;
  patientDfn: string;
  patientName: string | null;
  payerId: string;
  payerName: string | null;
  encounterIen: string | null;
  orderIen: string | null;
  loaType: string;
  status: string;
  urgency: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  clinicalSummary: string | null;
  requestedServiceDesc: string | null;
  requestedBy: string;
  requestedAt: string;
  authorizationNumber: string | null;
  approvedUnits: number | null;
  approvedFrom: string | null;
  approvedThrough: string | null;
  denialReason: string | null;
  packetGeneratedAt: string | null;
  submittedAt: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LoaAttachmentRow {
  id: string;
  loaRequestId: string;
  tenantId: string;
  attachmentType: string;
  fileName: string;
  mimeType: string;
  storagePath: string | null;
  inlineContent: string | null;
  description: string | null;
  addedBy: string;
  addedAt: string;
}

export interface CreateLoaInput {
  tenantId?: string;
  patientDfn: string;
  patientName?: string;
  payerId: string;
  payerName?: string;
  encounterIen?: string;
  orderIen?: string;
  loaType: string;
  urgency?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  clinicalSummary?: string;
  requestedServiceDesc?: string;
  requestedBy: string;
}

export interface AddAttachmentInput {
  loaRequestId: string;
  tenantId?: string;
  attachmentType: string;
  fileName: string;
  mimeType: string;
  storagePath?: string;
  inlineContent?: string;
  description?: string;
  addedBy: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function parseLoaRequest(row: any): LoaRequestRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    patientDfn: row.patientDfn,
    patientName: row.patientName,
    payerId: row.payerId,
    payerName: row.payerName,
    encounterIen: row.encounterIen,
    orderIen: row.orderIen,
    loaType: row.loaType,
    status: row.status,
    urgency: row.urgency,
    diagnosisCodes: safeJsonParse(row.diagnosisCodesJson, []),
    procedureCodes: safeJsonParse(row.procedureCodesJson, []),
    clinicalSummary: row.clinicalSummary,
    requestedServiceDesc: row.requestedServiceDesc,
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
    authorizationNumber: row.authorizationNumber,
    approvedUnits: row.approvedUnits,
    approvedFrom: row.approvedFrom,
    approvedThrough: row.approvedThrough,
    denialReason: row.denialReason,
    packetGeneratedAt: row.packetGeneratedAt,
    submittedAt: row.submittedAt,
    resolvedAt: row.resolvedAt,
    metadata: safeJsonParse(row.metadataJson, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseAttachment(row: any): LoaAttachmentRow {
  return {
    id: row.id,
    loaRequestId: row.loaRequestId,
    tenantId: row.tenantId,
    attachmentType: row.attachmentType,
    fileName: row.fileName,
    mimeType: row.mimeType,
    storagePath: row.storagePath,
    inlineContent: row.inlineContent,
    description: row.description,
    addedBy: row.addedBy,
    addedAt: row.addedAt,
  };
}

/* ------------------------------------------------------------------ */
/* LOA Request CRUD                                                    */
/* ------------------------------------------------------------------ */

export async function createLoaRequest(input: CreateLoaInput): Promise<LoaRequestRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  await db.insert(loaRequest)
    .values({
      id,
      tenantId,
      patientDfn: input.patientDfn,
      patientName: input.patientName || null,
      payerId: input.payerId,
      payerName: input.payerName || null,
      encounterIen: input.encounterIen || null,
      orderIen: input.orderIen || null,
      loaType: input.loaType,
      status: "draft",
      urgency: input.urgency || "standard",
      diagnosisCodesJson: JSON.stringify(input.diagnosisCodes || []),
      procedureCodesJson: JSON.stringify(input.procedureCodes || []),
      clinicalSummary: input.clinicalSummary || null,
      requestedServiceDesc: input.requestedServiceDesc || null,
      requestedBy: input.requestedBy,
      requestedAt: now,
      metadataJson: "{}",
      createdAt: now,
      updatedAt: now,
    });

  return (await getLoaRequestById(tenantId, id))!;
}

export async function getLoaRequestById(tenantId: string, id: string): Promise<LoaRequestRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(loaRequest)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)));
  const row = rows[0] ?? null;
  return row ? parseLoaRequest(row) : null;
}

export async function listLoaRequests(
  tenantId: string,
  filters?: { patientDfn?: string; payerId?: string; status?: string; loaType?: string }
): Promise<LoaRequestRow[]> {
  const db = getPgDb();
  const conditions = [eq(loaRequest.tenantId, tenantId)];
  if (filters?.patientDfn) conditions.push(eq(loaRequest.patientDfn, filters.patientDfn));
  if (filters?.payerId) conditions.push(eq(loaRequest.payerId, filters.payerId));
  if (filters?.status) conditions.push(eq(loaRequest.status, filters.status));
  if (filters?.loaType) conditions.push(eq(loaRequest.loaType, filters.loaType));

  const rows = await db
    .select()
    .from(loaRequest)
    .where(and(...conditions))
    .orderBy(desc(loaRequest.updatedAt));
  return rows.map(parseLoaRequest);
}

export async function updateLoaRequest(
  tenantId: string,
  id: string,
  updates: Partial<{
    patientName: string;
    payerName: string;
    loaType: string;
    urgency: string;
    diagnosisCodes: string[];
    procedureCodes: string[];
    clinicalSummary: string;
    requestedServiceDesc: string;
    metadata: Record<string, unknown>;
  }>
): Promise<LoaRequestRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };

  if (updates.patientName !== undefined) setClause.patientName = updates.patientName;
  if (updates.payerName !== undefined) setClause.payerName = updates.payerName;
  if (updates.loaType !== undefined) setClause.loaType = updates.loaType;
  if (updates.urgency !== undefined) setClause.urgency = updates.urgency;
  if (updates.diagnosisCodes !== undefined) setClause.diagnosisCodesJson = JSON.stringify(updates.diagnosisCodes);
  if (updates.procedureCodes !== undefined) setClause.procedureCodesJson = JSON.stringify(updates.procedureCodes);
  if (updates.clinicalSummary !== undefined) setClause.clinicalSummary = updates.clinicalSummary;
  if (updates.requestedServiceDesc !== undefined) setClause.requestedServiceDesc = updates.requestedServiceDesc;
  if (updates.metadata !== undefined) setClause.metadataJson = JSON.stringify(updates.metadata);

  await db.update(loaRequest)
    .set(setClause)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)));

  return getLoaRequestById(tenantId, id);
}

/**
 * Transition LOA status according to the FSM:
 * draft -> pending_review -> submitted -> approved | denied -> appealed -> expired -> closed
 */
export async function transitionLoaStatus(
  tenantId: string,
  id: string,
  newStatus: string,
  extra?: { authorizationNumber?: string; approvedUnits?: number; approvedFrom?: string; approvedThrough?: string; denialReason?: string }
): Promise<LoaRequestRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { status: newStatus, updatedAt: now };

  if (newStatus === "submitted") setClause.submittedAt = now;
  if (newStatus === "approved" || newStatus === "denied") setClause.resolvedAt = now;
  if (extra?.authorizationNumber) setClause.authorizationNumber = extra.authorizationNumber;
  if (extra?.approvedUnits !== undefined) setClause.approvedUnits = extra.approvedUnits;
  if (extra?.approvedFrom) setClause.approvedFrom = extra.approvedFrom;
  if (extra?.approvedThrough) setClause.approvedThrough = extra.approvedThrough;
  if (extra?.denialReason) setClause.denialReason = extra.denialReason;

  await db.update(loaRequest)
    .set(setClause)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)));

  return getLoaRequestById(tenantId, id);
}

export async function markPacketGenerated(tenantId: string, id: string): Promise<LoaRequestRow | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.update(loaRequest)
    .set({ packetGeneratedAt: now, updatedAt: now })
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)));
  return getLoaRequestById(tenantId, id);
}

export async function countLoaRequests(tenantId: string): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(loaRequest)
    .where(eq(loaRequest.tenantId, tenantId));
  return (rows[0] as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* LOA Attachment CRUD                                                 */
/* ------------------------------------------------------------------ */

export async function addAttachment(input: AddAttachmentInput): Promise<LoaAttachmentRow> {
  const db = getPgDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  await db.insert(loaAttachment)
    .values({
      id,
      loaRequestId: input.loaRequestId,
      tenantId,
      attachmentType: input.attachmentType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath: input.storagePath || null,
      inlineContent: input.inlineContent || null,
      description: input.description || null,
      addedBy: input.addedBy,
      addedAt: now,
    });

  const rows = await db.select().from(loaAttachment).where(eq(loaAttachment.id, id));
  return parseAttachment(rows[0]);
}

export async function listAttachments(loaRequestId: string): Promise<LoaAttachmentRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(loaAttachment)
    .where(eq(loaAttachment.loaRequestId, loaRequestId));
  return rows.map(parseAttachment);
}

export async function deleteAttachment(id: string): Promise<boolean> {
  const db = getPgDb();
  const result = await db.delete(loaAttachment).where(eq(loaAttachment.id, id));
  return (result as any).rowCount > 0;
}
