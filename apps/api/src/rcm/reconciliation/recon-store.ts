/**
 * Reconciliation Store — Phase 99: Durable SQLite Persistence
 *
 * CRUD for remittance_import, payment_record, reconciliation_match,
 * and underpayment_case tables using the platform DB.
 *
 * All amounts stored in cents. Dates as ISO 8601 strings.
 * Patient DFN stored but NEVER included in audit or logs.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../../platform/db/db.js";
import {
  remittanceImport,
  paymentRecord,
  reconciliationMatch,
  underpaymentCase,
} from "../../platform/db/schema.js";
import { eq, desc, asc, and, sql } from "drizzle-orm";
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
} from "./types.js";

/* ── Helpers ────────────────────────────────────────────────── */

function toCents(dollars: number | undefined): number | undefined {
  if (dollars === undefined) return undefined;
  return Math.round(dollars * 100);
}

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function rowToImport(row: any): RemittanceImport {
  return {
    id: row.id,
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

export function createRemittanceImport(opts: {
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
}): RemittanceImport {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    createdAt: now,
    sourceType: opts.sourceType,
    receivedAt: now,
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

  db.insert(remittanceImport).values(row).run();
  return rowToImport(row);
}

export function getRemittanceImportById(id: string): RemittanceImport | null {
  const db = getDb();
  const row = db.select().from(remittanceImport).where(eq(remittanceImport.id, id)).get();
  return row ? rowToImport(row) : null;
}

export function listRemittanceImports(): RemittanceImport[] {
  const db = getDb();
  return db.select().from(remittanceImport).orderBy(desc(remittanceImport.createdAt)).all().map(rowToImport);
}

/* ── Payment Record CRUD ────────────────────────────────────── */

export function createPaymentRecord(opts: {
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
}): PaymentRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    remittanceImportId: opts.remittanceImportId,
    createdAt: now,
    claimRef: opts.claimRef,
    payerId: opts.payerId,
    status: "IMPORTED" as const,
    billedAmountCents: opts.billedAmountCents,
    paidAmountCents: opts.paidAmountCents,
    allowedAmountCents: opts.allowedAmountCents ?? null,
    patientRespCents: opts.patientRespCents ?? null,
    adjustmentAmountCents: opts.adjustmentAmountCents ?? null,
    traceNumber: opts.traceNumber ?? null,
    checkNumber: opts.checkNumber ?? null,
    postedDate: opts.postedDate ?? null,
    serviceDate: opts.serviceDate ?? null,
    rawCodesJson: JSON.stringify(opts.rawCodes),
    patientDfn: opts.patientDfn ?? null,
    lineIndex: opts.lineIndex,
  };

  db.insert(paymentRecord).values(row).run();
  return rowToPayment(row);
}

export function getPaymentById(id: string): PaymentRecord | null {
  const db = getDb();
  const row = db.select().from(paymentRecord).where(eq(paymentRecord.id, id)).get();
  return row ? rowToPayment(row) : null;
}

export function updatePaymentStatus(id: string, status: PaymentStatus): PaymentRecord | null {
  const db = getDb();
  db.update(paymentRecord).set({ status }).where(eq(paymentRecord.id, id)).run();
  return getPaymentById(id);
}

export interface PaymentListResult {
  items: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function listPayments(query: PaymentListQuery): PaymentListResult {
  const db = getDb();
  const conditions: any[] = [];

  if (query.status) conditions.push(eq(paymentRecord.status, query.status));
  if (query.payerId) conditions.push(eq(paymentRecord.payerId, query.payerId));
  if (query.remittanceImportId) conditions.push(eq(paymentRecord.remittanceImportId, query.remittanceImportId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(paymentRecord).where(whereClause).get();
  const total = (countResult as any)?.count ?? 0;

  const sortCol = query.sort === "paidAmountCents" ? paymentRecord.paidAmountCents
    : query.sort === "claimRef" ? paymentRecord.claimRef
    : paymentRecord.createdAt;
  const orderFn = query.order === "asc" ? asc : desc;

  const offset = (query.page - 1) * query.limit;
  const rows = db.select().from(paymentRecord)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset)
    .all();

  return {
    items: rows.map(rowToPayment),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export function listPaymentsByImport(importId: string): PaymentRecord[] {
  const db = getDb();
  return db.select().from(paymentRecord)
    .where(eq(paymentRecord.remittanceImportId, importId))
    .orderBy(asc(paymentRecord.lineIndex))
    .all()
    .map(rowToPayment);
}

/* ── Reconciliation Match CRUD ──────────────────────────────── */

export function createMatch(opts: {
  paymentId: string;
  claimRef: string;
  matchConfidence: number;
  matchMethod: string;
  matchStatus: MatchStatus;
  matchNotes?: string;
}): ReconciliationMatch {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    createdAt: now,
    paymentId: opts.paymentId,
    claimRef: opts.claimRef,
    matchConfidence: opts.matchConfidence,
    matchMethod: opts.matchMethod,
    matchStatus: opts.matchStatus,
    matchNotes: opts.matchNotes ?? null,
    confirmedBy: null,
    confirmedAt: null,
  };

  db.insert(reconciliationMatch).values(row).run();
  return rowToMatch(row);
}

export function getMatchById(id: string): ReconciliationMatch | null {
  const db = getDb();
  const row = db.select().from(reconciliationMatch).where(eq(reconciliationMatch.id, id)).get();
  return row ? rowToMatch(row) : null;
}

export function confirmMatch(id: string, status: MatchStatus, actor: string, notes?: string): ReconciliationMatch | null {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(reconciliationMatch).set({
    matchStatus: status,
    confirmedBy: actor,
    confirmedAt: now,
    matchNotes: notes ?? null,
  }).where(eq(reconciliationMatch.id, id)).run();
  return getMatchById(id);
}

export function listMatchesByPayment(paymentId: string): ReconciliationMatch[] {
  const db = getDb();
  return db.select().from(reconciliationMatch)
    .where(eq(reconciliationMatch.paymentId, paymentId))
    .orderBy(desc(reconciliationMatch.matchConfidence))
    .all()
    .map(rowToMatch);
}

export function listMatchesByStatus(status: MatchStatus): ReconciliationMatch[] {
  const db = getDb();
  return db.select().from(reconciliationMatch)
    .where(eq(reconciliationMatch.matchStatus, status))
    .orderBy(desc(reconciliationMatch.createdAt))
    .all()
    .map(rowToMatch);
}

/* ── Underpayment Case CRUD ─────────────────────────────────── */

export function createUnderpaymentCase(opts: {
  claimRef: string;
  paymentId: string;
  payerId: string;
  expectedAmountModel: string;
  expectedAmountCents: number;
  paidAmountCents: number;
}): UnderpaymentCase {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const deltaCents = opts.expectedAmountCents - opts.paidAmountCents;

  const row = {
    id,
    createdAt: now,
    updatedAt: now,
    claimRef: opts.claimRef,
    paymentId: opts.paymentId,
    payerId: opts.payerId,
    expectedAmountModel: opts.expectedAmountModel,
    expectedAmountCents: opts.expectedAmountCents,
    paidAmountCents: opts.paidAmountCents,
    deltaCents,
    status: "NEW" as const,
    denialCaseId: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNote: null,
  };

  db.insert(underpaymentCase).values(row).run();
  return rowToUnderpayment(row);
}

export function getUnderpaymentById(id: string): UnderpaymentCase | null {
  const db = getDb();
  const row = db.select().from(underpaymentCase).where(eq(underpaymentCase.id, id)).get();
  return row ? rowToUnderpayment(row) : null;
}

export function updateUnderpaymentCase(
  id: string,
  updates: { status?: UnderpaymentStatus; resolutionNote?: string; denialCaseId?: string },
  actor: string,
): UnderpaymentCase | null {
  const db = getDb();
  const existing = getUnderpaymentById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const setClause: Record<string, any> = { updatedAt: now };
  if (updates.status) setClause.status = updates.status;
  if (updates.resolutionNote !== undefined) setClause.resolutionNote = updates.resolutionNote;
  if (updates.denialCaseId) setClause.denialCaseId = updates.denialCaseId;
  if (updates.status === "RESOLVED" || updates.status === "WRITTEN_OFF") {
    setClause.resolvedAt = now;
    setClause.resolvedBy = actor;
  }

  db.update(underpaymentCase).set(setClause).where(eq(underpaymentCase.id, id)).run();
  return getUnderpaymentById(id);
}

export function listUnderpayments(query: UnderpaymentListQuery): {
  items: UnderpaymentCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  const db = getDb();
  const conditions: any[] = [];

  if (query.status) conditions.push(eq(underpaymentCase.status, query.status));
  if (query.payerId) conditions.push(eq(underpaymentCase.payerId, query.payerId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = db.select({ count: sql<number>`count(*)` })
    .from(underpaymentCase).where(whereClause).get();
  const total = (countResult as any)?.count ?? 0;

  const sortCol = query.sort === "deltaCents" ? underpaymentCase.deltaCents
    : query.sort === "updatedAt" ? underpaymentCase.updatedAt
    : underpaymentCase.createdAt;
  const orderFn = query.order === "asc" ? asc : desc;

  const offset = (query.page - 1) * query.limit;
  const rows = db.select().from(underpaymentCase)
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset)
    .all();

  return {
    items: rows.map(rowToUnderpayment),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

/* ── Stats ──────────────────────────────────────────────────── */

export function getReconciliationStats(): ReconciliationStats {
  const db = getDb();

  const importCount = db.select({ count: sql<number>`count(*)` }).from(remittanceImport).get();
  const paymentCount = db.select({ count: sql<number>`count(*)` }).from(paymentRecord).get();
  const matchedCount = db.select({ count: sql<number>`count(*)` }).from(paymentRecord)
    .where(eq(paymentRecord.status, "MATCHED")).get();
  const unmatchedCount = db.select({ count: sql<number>`count(*)` }).from(paymentRecord)
    .where(eq(paymentRecord.status, "UNMATCHED")).get();
  const totalPaid = db.select({ sum: sql<number>`COALESCE(SUM(paid_amount_cents), 0)` }).from(paymentRecord).get();
  const underpayCount = db.select({ count: sql<number>`count(*)` }).from(underpaymentCase).get();
  const openUnderpay = db.select({ count: sql<number>`count(*)` }).from(underpaymentCase)
    .where(eq(underpaymentCase.status, "NEW")).get();
  const totalDelta = db.select({ sum: sql<number>`COALESCE(SUM(delta_cents), 0)` }).from(underpaymentCase).get();

  return {
    totalImports: (importCount as any)?.count ?? 0,
    totalPayments: (paymentCount as any)?.count ?? 0,
    matchedPayments: (matchedCount as any)?.count ?? 0,
    unmatchedPayments: (unmatchedCount as any)?.count ?? 0,
    totalPaidCents: (totalPaid as any)?.sum ?? 0,
    totalUnderpayments: (underpayCount as any)?.count ?? 0,
    openUnderpayments: (openUnderpay as any)?.count ?? 0,
    totalDeltaCents: (totalDelta as any)?.sum ?? 0,
  };
}
