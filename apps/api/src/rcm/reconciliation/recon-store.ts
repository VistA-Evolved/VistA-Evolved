/**
 * Reconciliation Store — PG Drizzle Persistence
 *
 * CRUD for remittance_import, payment_record, reconciliation_match,
 * and underpayment_case tables using the platform PG DB.
 *
 * All amounts stored in cents. Dates as ISO 8601 strings.
 * Patient DFN stored but NEVER included in audit or logs.
 */

import { randomUUID } from 'node:crypto';
import { getPgDb } from '../../platform/pg/pg-db.js';
import {
  remittanceImport,
  paymentRecord,
  reconciliationMatch,
  underpaymentCase,
} from '../../platform/pg/pg-schema.js';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import type {
  RemittanceImport,
  PaymentRecord,
  ReconciliationMatch,
  UnderpaymentCase,
  PaymentStatus,
  MatchStatus,
  UnderpaymentStatus,
  PaymentListQuery,
  UnderpaymentListQuery,
  PaymentCode,
  RemittanceSourceType,
  ReconciliationStats,
} from './types.js';

/* ── Helpers ────────────────────────────────────────────────── */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function rowToImport(row: any): RemittanceImport {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
    sourceType: row.sourceType as RemittanceSourceType,
    receivedAt: row.receivedAt,
    fileHash: row.fileHash ?? null,
    originalFilename: row.originalFilename ?? null,
    parserName: row.parserName ?? null,
    parserVersion: row.parserVersion ?? null,
    mappingVersion: row.mappingVersion ?? null,
    lineCount: row.lineCount ?? 0,
    totalPaidCents: row.totalPaidCents ?? 0,
    totalBilledCents: row.totalBilledCents ?? 0,
    importedBy: row.importedBy,
  };
}

function rowToPayment(row: any): PaymentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    remittanceImportId: row.remittanceImportId,
    createdAt: row.createdAt,
    claimRef: row.claimRef,
    payerId: row.payerId,
    status: row.status as PaymentStatus,
    billedAmountCents: row.billedAmountCents ?? 0,
    paidAmountCents: row.paidAmountCents ?? 0,
    allowedAmountCents: row.allowedAmountCents ?? null,
    patientRespCents: row.patientRespCents ?? null,
    adjustmentAmountCents: row.adjustmentAmountCents ?? null,
    traceNumber: row.traceNumber ?? null,
    checkNumber: row.checkNumber ?? null,
    postedDate: row.postedDate ?? null,
    serviceDate: row.serviceDate ?? null,
    rawCodes: safeJsonParse(row.rawCodesJson, []),
    patientDfn: row.patientDfn ?? null,
    lineIndex: row.lineIndex ?? 0,
  };
}

function rowToMatch(row: any): ReconciliationMatch {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
    paymentId: row.paymentId,
    claimRef: row.claimRef,
    matchConfidence: row.matchConfidence ?? 0,
    matchMethod: row.matchMethod as any,
    matchStatus: row.matchStatus as MatchStatus,
    matchNotes: row.matchNotes ?? null,
    confirmedBy: row.confirmedBy ?? null,
    confirmedAt: row.confirmedAt ?? null,
  };
}

function rowToUnderpayment(row: any): UnderpaymentCase {
  return {
    id: row.id,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    claimRef: row.claimRef,
    paymentId: row.paymentId,
    payerId: row.payerId,
    expectedAmountModel: row.expectedAmountModel as any,
    expectedAmountCents: row.expectedAmountCents,
    paidAmountCents: row.paidAmountCents,
    deltaCents: row.deltaCents,
    status: row.status as UnderpaymentStatus,
    denialCaseId: row.denialCaseId ?? null,
    resolvedAt: row.resolvedAt ?? null,
    resolvedBy: row.resolvedBy ?? null,
    resolutionNote: row.resolutionNote ?? null,
  };
}

/* ── Remittance Import CRUD ─────────────────────────────────── */

export async function createRemittanceImport(opts: {
  tenantId: string;
  sourceType: RemittanceSourceType;
  fileHash?: string;
  originalFilename?: string;
  parserName?: string;
  parserVersion?: string;
  mappingVersion?: string;
  lineCount: number;
  totalPaidCents: number;
  totalBilledCents: number;
  importedBy: string;
}): Promise<RemittanceImport> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    tenantId: opts.tenantId,
    createdAt: new Date(now),
    sourceType: opts.sourceType,
    receivedAt: new Date(now),
    fileHash: opts.fileHash ?? null,
    originalFilename: opts.originalFilename ?? null,
    parserName: opts.parserName ?? null,
    parserVersion: opts.parserVersion ?? null,
    mappingVersion: opts.mappingVersion ?? null,
    lineCount: opts.lineCount,
    totalPaidCents: opts.totalPaidCents,
    totalBilledCents: opts.totalBilledCents,
    importedBy: opts.importedBy,
  };

  await db.insert(remittanceImport).values(row);
  return rowToImport(row);
}

export async function getRemittanceImportById(
  tenantId: string,
  id: string
): Promise<RemittanceImport | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(remittanceImport)
    .where(and(eq(remittanceImport.tenantId, tenantId), eq(remittanceImport.id, id)));
  return rows[0] ? rowToImport(rows[0]) : null;
}

export async function listRemittanceImports(tenantId: string): Promise<RemittanceImport[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(remittanceImport)
    .where(eq(remittanceImport.tenantId, tenantId))
    .orderBy(desc(remittanceImport.createdAt));
  return rows.map(rowToImport);
}

/* ── Payment Record CRUD ────────────────────────────────────── */

export async function createPaymentRecord(opts: {
  tenantId: string;
  remittanceImportId: string;
  claimRef: string;
  payerId: string;
  billedAmountCents: number;
  paidAmountCents: number;
  allowedAmountCents?: number;
  patientRespCents?: number;
  adjustmentAmountCents?: number;
  traceNumber?: string;
  checkNumber?: string;
  postedDate?: string;
  serviceDate?: string;
  rawCodes: PaymentCode[];
  patientDfn?: string;
  lineIndex: number;
}): Promise<PaymentRecord> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    tenantId: opts.tenantId,
    remittanceImportId: opts.remittanceImportId,
    createdAt: new Date(now),
    claimRef: opts.claimRef,
    payerId: opts.payerId,
    status: 'IMPORTED' as const,
    billedAmountCents: opts.billedAmountCents,
    paidAmountCents: opts.paidAmountCents,
    allowedAmountCents: opts.allowedAmountCents ?? null,
    patientRespCents: opts.patientRespCents ?? null,
    adjustmentAmountCents: opts.adjustmentAmountCents ?? null,
    traceNumber: opts.traceNumber ?? null,
    checkNumber: opts.checkNumber ?? null,
    postedDate: opts.postedDate ? new Date(opts.postedDate) : null,
    serviceDate: opts.serviceDate ? new Date(opts.serviceDate) : null,
    rawCodesJson: JSON.stringify(opts.rawCodes),
    patientDfn: opts.patientDfn ?? null,
    lineIndex: opts.lineIndex,
  };

  await db.insert(paymentRecord).values(row);
  return rowToPayment(row);
}

export async function getPaymentById(tenantId: string, id: string): Promise<PaymentRecord | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(paymentRecord)
    .where(and(eq(paymentRecord.tenantId, tenantId), eq(paymentRecord.id, id)));
  return rows[0] ? rowToPayment(rows[0]) : null;
}

export async function updatePaymentStatus(
  tenantId: string,
  id: string,
  status: PaymentStatus
): Promise<PaymentRecord | null> {
  const db = getPgDb();
  await db
    .update(paymentRecord)
    .set({ status })
    .where(and(eq(paymentRecord.tenantId, tenantId), eq(paymentRecord.id, id)));
  return getPaymentById(tenantId, id);
}

export interface PaymentListResult {
  items: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listPayments(
  tenantId: string,
  query: PaymentListQuery
): Promise<PaymentListResult> {
  const db = getPgDb();
  const conditions: any[] = [eq(paymentRecord.tenantId, tenantId)];

  if (query.status) conditions.push(eq(paymentRecord.status, query.status));
  if (query.payerId) conditions.push(eq(paymentRecord.payerId, query.payerId));
  if (query.remittanceImportId)
    conditions.push(eq(paymentRecord.remittanceImportId, query.remittanceImportId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentRecord)
    .where(whereClause);
  const total = (countRows[0] as any)?.count ?? 0;

  const sortCol =
    query.sort === 'paidAmountCents'
      ? paymentRecord.paidAmountCents
      : query.sort === 'claimRef'
        ? paymentRecord.claimRef
        : paymentRecord.createdAt;
  const orderFn = query.order === 'asc' ? asc : desc;

  const offset = (query.page - 1) * query.limit;
  const rows = await db
    .select()
    .from(paymentRecord)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset);

  return {
    items: rows.map(rowToPayment),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function listPaymentsByImport(
  tenantId: string,
  importId: string
): Promise<PaymentRecord[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(paymentRecord)
    .where(
      and(eq(paymentRecord.tenantId, tenantId), eq(paymentRecord.remittanceImportId, importId))
    )
    .orderBy(asc(paymentRecord.lineIndex));
  return rows.map(rowToPayment);
}

/* ── Reconciliation Match CRUD ──────────────────────────────── */

export async function createMatch(opts: {
  tenantId: string;
  paymentId: string;
  claimRef: string;
  matchConfidence: number;
  matchMethod: string;
  matchStatus: MatchStatus;
  matchNotes?: string;
}): Promise<ReconciliationMatch> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    tenantId: opts.tenantId,
    createdAt: new Date(now),
    paymentId: opts.paymentId,
    claimRef: opts.claimRef,
    matchConfidence: opts.matchConfidence,
    matchMethod: opts.matchMethod,
    matchStatus: opts.matchStatus,
    matchNotes: opts.matchNotes ?? null,
    confirmedBy: null,
    confirmedAt: null,
  };

  await db.insert(reconciliationMatch).values(row);
  return rowToMatch(row);
}

export async function getMatchById(
  tenantId: string,
  id: string
): Promise<ReconciliationMatch | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(reconciliationMatch)
    .where(and(eq(reconciliationMatch.tenantId, tenantId), eq(reconciliationMatch.id, id)));
  return rows[0] ? rowToMatch(rows[0]) : null;
}

export async function confirmMatch(
  tenantId: string,
  id: string,
  status: MatchStatus,
  actor: string,
  notes?: string
): Promise<ReconciliationMatch | null> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(reconciliationMatch)
    .set({
      matchStatus: status,
      confirmedBy: actor,
      confirmedAt: new Date(now),
      matchNotes: notes ?? null,
    })
    .where(and(eq(reconciliationMatch.tenantId, tenantId), eq(reconciliationMatch.id, id)));
  return getMatchById(tenantId, id);
}

export async function listMatchesByPayment(
  tenantId: string,
  paymentId: string
): Promise<ReconciliationMatch[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(reconciliationMatch)
    .where(
      and(eq(reconciliationMatch.tenantId, tenantId), eq(reconciliationMatch.paymentId, paymentId))
    )
    .orderBy(desc(reconciliationMatch.matchConfidence));
  return rows.map(rowToMatch);
}

export async function listMatchesByStatus(
  tenantId: string,
  status: MatchStatus
): Promise<ReconciliationMatch[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(reconciliationMatch)
    .where(
      and(eq(reconciliationMatch.tenantId, tenantId), eq(reconciliationMatch.matchStatus, status))
    )
    .orderBy(desc(reconciliationMatch.createdAt));
  return rows.map(rowToMatch);
}

/* ── Underpayment Case CRUD ─────────────────────────────────── */

export async function createUnderpaymentCase(opts: {
  tenantId: string;
  claimRef: string;
  paymentId: string;
  payerId: string;
  expectedAmountModel: string;
  expectedAmountCents: number;
  paidAmountCents: number;
}): Promise<UnderpaymentCase> {
  const db = getPgDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const deltaCents = opts.expectedAmountCents - opts.paidAmountCents;

  const row = {
    id,
    tenantId: opts.tenantId,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    claimRef: opts.claimRef,
    paymentId: opts.paymentId,
    payerId: opts.payerId,
    expectedAmountModel: opts.expectedAmountModel,
    expectedAmountCents: opts.expectedAmountCents,
    paidAmountCents: opts.paidAmountCents,
    deltaCents,
    status: 'NEW' as const,
    denialCaseId: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
  };

  await db.insert(underpaymentCase).values(row);
  return rowToUnderpayment(row);
}

export async function getUnderpaymentById(
  tenantId: string,
  id: string
): Promise<UnderpaymentCase | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(underpaymentCase)
    .where(and(eq(underpaymentCase.tenantId, tenantId), eq(underpaymentCase.id, id)));
  return rows[0] ? rowToUnderpayment(rows[0]) : null;
}

export async function updateUnderpaymentCase(
  tenantId: string,
  id: string,
  updates: { status?: UnderpaymentStatus; resolutionNote?: string; denialCaseId?: string },
  actor: string
): Promise<UnderpaymentCase | null> {
  const db = getPgDb();
  const existing = await getUnderpaymentById(tenantId, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };
  if (updates.status) setClause.status = updates.status;
  if (updates.resolutionNote !== undefined) setClause.resolutionNote = updates.resolutionNote;
  if (updates.denialCaseId) setClause.denialCaseId = updates.denialCaseId;
  if (updates.status === 'RESOLVED' || updates.status === 'WRITTEN_OFF') {
    setClause.resolvedAt = now;
    setClause.resolvedBy = actor;
  }

  await db
    .update(underpaymentCase)
    .set(setClause)
    .where(and(eq(underpaymentCase.tenantId, tenantId), eq(underpaymentCase.id, id)));
  return getUnderpaymentById(tenantId, id);
}

export async function listUnderpayments(
  tenantId: string,
  query: UnderpaymentListQuery
): Promise<{
  items: UnderpaymentCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const db = getPgDb();
  const conditions: any[] = [eq(underpaymentCase.tenantId, tenantId)];

  if (query.status) conditions.push(eq(underpaymentCase.status, query.status));
  if (query.payerId) conditions.push(eq(underpaymentCase.payerId, query.payerId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(underpaymentCase)
    .where(whereClause);
  const total = (countRows[0] as any)?.count ?? 0;

  const sortCol =
    query.sort === 'deltaCents'
      ? underpaymentCase.deltaCents
      : query.sort === 'updatedAt'
        ? underpaymentCase.updatedAt
        : underpaymentCase.createdAt;
  const orderFn = query.order === 'asc' ? asc : desc;

  const offset = (query.page - 1) * query.limit;
  const rows = await db
    .select()
    .from(underpaymentCase)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset);

  return {
    items: rows.map(rowToUnderpayment),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

/* ── Stats ──────────────────────────────────────────────────── */

export async function getReconciliationStats(tenantId: string): Promise<ReconciliationStats> {
  const db = getPgDb();

  const importCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(remittanceImport)
    .where(eq(remittanceImport.tenantId, tenantId));
  const paymentCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentRecord)
    .where(eq(paymentRecord.tenantId, tenantId));
  const matchedCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentRecord)
    .where(and(eq(paymentRecord.tenantId, tenantId), eq(paymentRecord.status, 'MATCHED')));
  const unmatchedCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentRecord)
    .where(and(eq(paymentRecord.tenantId, tenantId), eq(paymentRecord.status, 'UNMATCHED')));
  const totalPaidRows = await db
    .select({ sum: sql<number>`COALESCE(SUM(paid_amount_cents), 0)` })
    .from(paymentRecord)
    .where(eq(paymentRecord.tenantId, tenantId));
  const underpayCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(underpaymentCase)
    .where(eq(underpaymentCase.tenantId, tenantId));
  const openUnderpayRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(underpaymentCase)
    .where(and(eq(underpaymentCase.tenantId, tenantId), eq(underpaymentCase.status, 'NEW')));
  const totalDeltaRows = await db
    .select({ sum: sql<number>`COALESCE(SUM(delta_cents), 0)` })
    .from(underpaymentCase)
    .where(eq(underpaymentCase.tenantId, tenantId));

  return {
    totalImports: (importCountRows[0] as any)?.count ?? 0,
    totalPayments: (paymentCountRows[0] as any)?.count ?? 0,
    matchedPayments: (matchedCountRows[0] as any)?.count ?? 0,
    unmatchedPayments: (unmatchedCountRows[0] as any)?.count ?? 0,
    totalPaidCents: (totalPaidRows[0] as any)?.sum ?? 0,
    totalUnderpayments: (underpayCountRows[0] as any)?.count ?? 0,
    openUnderpayments: (openUnderpayRows[0] as any)?.count ?? 0,
    totalDeltaCents: (totalDeltaRows[0] as any)?.sum ?? 0,
  };
}
