/**
 * LOA (Letter of Authorization) Repository -- Phase 110
 *
 * CRUD for loa_request and loa_attachment tables.
 * All operations are tenant-scoped.
 */

import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "../../platform/db/db.js";
import { loaRequest, loaAttachment } from "../../platform/db/schema.js";
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

export function createLoaRequest(input: CreateLoaInput): LoaRequestRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  db.insert(loaRequest)
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
    })
    .run();

  return getLoaRequestById(tenantId, id)!;
}

export function getLoaRequestById(tenantId: string, id: string): LoaRequestRow | null {
  const db = getDb();
  const row = db
    .select()
    .from(loaRequest)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)))
    .get();
  return row ? parseLoaRequest(row) : null;
}

export function listLoaRequests(
  tenantId: string,
  filters?: { patientDfn?: string; payerId?: string; status?: string; loaType?: string }
): LoaRequestRow[] {
  const db = getDb();
  const conditions = [eq(loaRequest.tenantId, tenantId)];
  if (filters?.patientDfn) conditions.push(eq(loaRequest.patientDfn, filters.patientDfn));
  if (filters?.payerId) conditions.push(eq(loaRequest.payerId, filters.payerId));
  if (filters?.status) conditions.push(eq(loaRequest.status, filters.status));
  if (filters?.loaType) conditions.push(eq(loaRequest.loaType, filters.loaType));

  return db
    .select()
    .from(loaRequest)
    .where(and(...conditions))
    .orderBy(desc(loaRequest.updatedAt))
    .all()
    .map(parseLoaRequest);
}

export function updateLoaRequest(
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
): LoaRequestRow | null {
  const db = getDb();
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

  db.update(loaRequest)
    .set(setClause)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)))
    .run();

  return getLoaRequestById(tenantId, id);
}

/**
 * Transition LOA status according to the FSM:
 * draft -> pending_review -> submitted -> approved | denied -> appealed -> expired -> closed
 */
export function transitionLoaStatus(
  tenantId: string,
  id: string,
  newStatus: string,
  extra?: { authorizationNumber?: string; approvedUnits?: number; approvedFrom?: string; approvedThrough?: string; denialReason?: string }
): LoaRequestRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  const setClause: Record<string, any> = { status: newStatus, updatedAt: now };

  if (newStatus === "submitted") setClause.submittedAt = now;
  if (newStatus === "approved" || newStatus === "denied") setClause.resolvedAt = now;
  if (extra?.authorizationNumber) setClause.authorizationNumber = extra.authorizationNumber;
  if (extra?.approvedUnits !== undefined) setClause.approvedUnits = extra.approvedUnits;
  if (extra?.approvedFrom) setClause.approvedFrom = extra.approvedFrom;
  if (extra?.approvedThrough) setClause.approvedThrough = extra.approvedThrough;
  if (extra?.denialReason) setClause.denialReason = extra.denialReason;

  db.update(loaRequest)
    .set(setClause)
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)))
    .run();

  return getLoaRequestById(tenantId, id);
}

export function markPacketGenerated(tenantId: string, id: string): LoaRequestRow | null {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(loaRequest)
    .set({ packetGeneratedAt: now, updatedAt: now })
    .where(and(eq(loaRequest.tenantId, tenantId), eq(loaRequest.id, id)))
    .run();
  return getLoaRequestById(tenantId, id);
}

export function countLoaRequests(tenantId: string): number {
  const db = getDb();
  const result = db
    .select({ cnt: count() })
    .from(loaRequest)
    .where(eq(loaRequest.tenantId, tenantId))
    .get();
  return (result as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* LOA Attachment CRUD                                                 */
/* ------------------------------------------------------------------ */

export function addAttachment(input: AddAttachmentInput): LoaAttachmentRow {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenantId = input.tenantId || "default";

  db.insert(loaAttachment)
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
    })
    .run();

  const row = db.select().from(loaAttachment).where(eq(loaAttachment.id, id)).get();
  return parseAttachment(row);
}

export function listAttachments(loaRequestId: string): LoaAttachmentRow[] {
  const db = getDb();
  return db
    .select()
    .from(loaAttachment)
    .where(eq(loaAttachment.loaRequestId, loaRequestId))
    .all()
    .map(parseAttachment);
}

export function deleteAttachment(id: string): boolean {
  const db = getDb();
  const result = db.delete(loaAttachment).where(eq(loaAttachment.id, id)).run();
  return result.changes > 0;
}
