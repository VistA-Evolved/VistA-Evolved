/**
 * PG RCM Claim Repository — Async durable claims + remittances
 *
 * Phase 126: RCM Durability Wave (Map stores -> Postgres)
 *
 * Mirrors the SQLite rcm-claim-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import { pgRcmClaim, pgRcmRemittance } from "../pg-schema.js";

export type RcmClaimRow = typeof pgRcmClaim.$inferSelect;
export type RcmRemittanceRow = typeof pgRcmRemittance.$inferSelect;

/* ── Claims ────────────────────────────────────────────────── */

export async function insertClaim(data: {
  id: string;
  tenantId: string;
  claimType?: string;
  status?: string;
  patientDfn: string;
  patientName?: string;
  patientDob?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientGender?: string;
  subscriberId?: string;
  billingProviderNpi?: string;
  renderingProviderNpi?: string;
  facilityNpi?: string;
  facilityName?: string;
  facilityTaxId?: string;
  payerId: string;
  payerName?: string;
  payerClaimId?: string;
  dateOfService: string;
  diagnosesJson?: string;
  linesJson?: string;
  totalCharge?: number;
  ediTransactionId?: string;
  connectorId?: string;
  submittedAt?: string;
  responseReceivedAt?: string;
  paidAmount?: number;
  adjustmentAmount?: number;
  patientResponsibility?: number;
  remitDate?: string;
  vistaChargeIen?: string;
  vistaArIen?: string;
  validationResultJson?: string;
  pipelineEntryId?: string;
  exportArtifactPath?: string;
  isDemo?: boolean;
  submissionSafetyMode?: string;
  isMock?: boolean;
  auditTrailJson?: string;
  createdAt: string;
  updatedAt: string;
}): Promise<RcmClaimRow> {
  const db = getPgDb();
  await db.insert(pgRcmClaim).values({
    id: data.id,
    tenantId: data.tenantId,
    claimType: data.claimType ?? "professional",
    status: data.status ?? "draft",
    patientDfn: data.patientDfn,
    patientName: data.patientName ?? null,
    patientDob: data.patientDob ?? null,
    patientFirstName: data.patientFirstName ?? null,
    patientLastName: data.patientLastName ?? null,
    patientGender: data.patientGender ?? null,
    subscriberId: data.subscriberId ?? null,
    billingProviderNpi: data.billingProviderNpi ?? null,
    renderingProviderNpi: data.renderingProviderNpi ?? null,
    facilityNpi: data.facilityNpi ?? null,
    facilityName: data.facilityName ?? null,
    facilityTaxId: data.facilityTaxId ?? null,
    payerId: data.payerId,
    payerName: data.payerName ?? null,
    payerClaimId: data.payerClaimId ?? null,
    dateOfService: data.dateOfService,
    diagnosesJson: data.diagnosesJson ?? "[]",
    linesJson: data.linesJson ?? "[]",
    totalCharge: data.totalCharge ?? 0,
    ediTransactionId: data.ediTransactionId ?? null,
    connectorId: data.connectorId ?? null,
    submittedAt: data.submittedAt ?? null,
    responseReceivedAt: data.responseReceivedAt ?? null,
    paidAmount: data.paidAmount ?? null,
    adjustmentAmount: data.adjustmentAmount ?? null,
    patientResponsibility: data.patientResponsibility ?? null,
    remitDate: data.remitDate ?? null,
    vistaChargeIen: data.vistaChargeIen ?? null,
    vistaArIen: data.vistaArIen ?? null,
    validationResultJson: data.validationResultJson ?? null,
    pipelineEntryId: data.pipelineEntryId ?? null,
    exportArtifactPath: data.exportArtifactPath ?? null,
    isDemo: data.isDemo ?? false,
    submissionSafetyMode: data.submissionSafetyMode ?? "export_only",
    isMock: data.isMock ?? false,
    auditTrailJson: data.auditTrailJson ?? "[]",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
  const row = await findClaimById(data.id);
  return row!;
}

export async function findClaimById(id: string): Promise<RcmClaimRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRcmClaim).where(eq(pgRcmClaim.id, id));
  return rows[0];
}

export async function findClaimsByTenant(
  tenantId: string,
  opts?: { status?: string; patientDfn?: string; payerId?: string; limit?: number; offset?: number },
): Promise<RcmClaimRow[]> {
  const db = getPgDb();
  const conditions = [eq(pgRcmClaim.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(pgRcmClaim.status, opts.status));
  if (opts?.patientDfn) conditions.push(eq(pgRcmClaim.patientDfn, opts.patientDfn));
  if (opts?.payerId) conditions.push(eq(pgRcmClaim.payerId, opts.payerId));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db.select().from(pgRcmClaim)
    .where(and(...conditions))
    .orderBy(desc(pgRcmClaim.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function countClaimsByTenant(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgRcmClaim)
    .where(eq(pgRcmClaim.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

export async function updateClaim(id: string, updates: Partial<{
  status: string;
  payerClaimId: string;
  ediTransactionId: string;
  connectorId: string;
  submittedAt: string;
  responseReceivedAt: string;
  paidAmount: number;
  adjustmentAmount: number;
  patientResponsibility: number;
  remitDate: string;
  validationResultJson: string;
  pipelineEntryId: string;
  exportArtifactPath: string;
  submissionSafetyMode: string;
  auditTrailJson: string;
  diagnosesJson: string;
  linesJson: string;
  totalCharge: number;
}>): Promise<RcmClaimRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.update(pgRcmClaim)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgRcmClaim.id, id));
  return findClaimById(id);
}

export async function countAllClaims(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgRcmClaim);
  return result[0]?.count ?? 0;
}

/* ── Remittances ───────────────────────────────────────────── */

export async function insertRemittance(data: {
  id: string;
  tenantId: string;
  status?: string;
  ediTransactionId?: string;
  checkNumber?: string;
  checkDate?: string;
  eftTraceNumber?: string;
  payerId: string;
  payerName?: string;
  claimId?: string;
  payerClaimId?: string;
  patientDfn?: string;
  totalCharged: number;
  totalPaid: number;
  totalAdjusted: number;
  totalPatientResponsibility: number;
  serviceLinesJson?: string;
  isMock?: boolean;
  importedAt: string;
  matchedAt?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}): Promise<RcmRemittanceRow> {
  const db = getPgDb();
  await db.insert(pgRcmRemittance).values({
    id: data.id,
    tenantId: data.tenantId,
    status: data.status ?? "received",
    ediTransactionId: data.ediTransactionId ?? null,
    checkNumber: data.checkNumber ?? null,
    checkDate: data.checkDate ?? null,
    eftTraceNumber: data.eftTraceNumber ?? null,
    payerId: data.payerId,
    payerName: data.payerName ?? null,
    claimId: data.claimId ?? null,
    payerClaimId: data.payerClaimId ?? null,
    patientDfn: data.patientDfn ?? null,
    totalCharged: data.totalCharged,
    totalPaid: data.totalPaid,
    totalAdjusted: data.totalAdjusted,
    totalPatientResponsibility: data.totalPatientResponsibility,
    serviceLinesJson: data.serviceLinesJson ?? "[]",
    isMock: data.isMock ?? false,
    importedAt: data.importedAt,
    matchedAt: data.matchedAt ?? null,
    postedAt: data.postedAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
  const row = await findRemittanceById(data.id);
  return row!;
}

export async function findRemittanceById(id: string): Promise<RcmRemittanceRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRcmRemittance).where(eq(pgRcmRemittance.id, id));
  return rows[0];
}

export async function findRemittancesByTenant(
  tenantId: string,
  limit = 50,
  offset = 0,
): Promise<RcmRemittanceRow[]> {
  const db = getPgDb();
  return db.select().from(pgRcmRemittance)
    .where(eq(pgRcmRemittance.tenantId, tenantId))
    .orderBy(desc(pgRcmRemittance.importedAt))
    .limit(limit)
    .offset(offset);
}

export async function updateRemittance(id: string, updates: Partial<{
  status: string;
  claimId: string;
  matchedAt: string;
  postedAt: string;
}>): Promise<RcmRemittanceRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db.update(pgRcmRemittance)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgRcmRemittance.id, id));
  return findRemittanceById(id);
}

export async function countAllRemittances(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgRcmRemittance);
  return result[0]?.count ?? 0;
}

export async function countRemittancesByTenant(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(pgRcmRemittance)
    .where(eq(pgRcmRemittance.tenantId, tenantId));
  return result[0]?.count ?? 0;
}
