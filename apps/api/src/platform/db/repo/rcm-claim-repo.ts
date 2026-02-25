/**
 * RCM Claim Repository — DB-backed durable claims + remittances
 *
 * Phase 121: Durability Wave 1
 *
 * CRUD for the RCM claim store (domain/claim-store.ts).
 * Claims and remittances are stored as typed rows with JSON columns
 * for complex nested structures (diagnoses, lines, audit trail).
 */

import { randomUUID } from "node:crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { rcmClaim, rcmRemittance } from "../schema.js";

export type RcmClaimRow = typeof rcmClaim.$inferSelect;
export type RcmRemittanceRow = typeof rcmRemittance.$inferSelect;

/* ── Claims ────────────────────────────────────────────────── */

export function insertClaim(data: {
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
}): RcmClaimRow {
  const db = getDb();
  db.insert(rcmClaim).values({
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
  }).run();
  return findClaimById(data.id)!;
}

export function findClaimById(id: string): RcmClaimRow | undefined {
  const db = getDb();
  return db.select().from(rcmClaim).where(eq(rcmClaim.id, id)).get();
}

export function findClaimsByTenant(
  tenantId: string,
  opts?: { status?: string; patientDfn?: string; payerId?: string; limit?: number; offset?: number },
): RcmClaimRow[] {
  const db = getDb();
  const conditions = [eq(rcmClaim.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(rcmClaim.status, opts.status));
  if (opts?.patientDfn) conditions.push(eq(rcmClaim.patientDfn, opts.patientDfn));
  if (opts?.payerId) conditions.push(eq(rcmClaim.payerId, opts.payerId));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db.select().from(rcmClaim)
    .where(and(...conditions))
    .orderBy(desc(rcmClaim.updatedAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function countClaimsByTenant(tenantId: string): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(rcmClaim)
    .where(eq(rcmClaim.tenantId, tenantId))
    .get();
  return result?.count ?? 0;
}

export function updateClaim(id: string, updates: Partial<{
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
}>): RcmClaimRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(rcmClaim)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(rcmClaim.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findClaimById(id);
}

export function countAllClaims(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(rcmClaim).get();
  return result?.count ?? 0;
}

/* ── Remittances ───────────────────────────────────────────── */

export function insertRemittance(data: {
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
}): RcmRemittanceRow {
  const db = getDb();
  db.insert(rcmRemittance).values({
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
  }).run();
  return findRemittanceById(data.id)!;
}

export function findRemittanceById(id: string): RcmRemittanceRow | undefined {
  const db = getDb();
  return db.select().from(rcmRemittance).where(eq(rcmRemittance.id, id)).get();
}

export function findRemittancesByTenant(
  tenantId: string,
  limit = 50,
  offset = 0,
): RcmRemittanceRow[] {
  const db = getDb();
  return db.select().from(rcmRemittance)
    .where(eq(rcmRemittance.tenantId, tenantId))
    .orderBy(desc(rcmRemittance.importedAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function updateRemittance(id: string, updates: Partial<{
  status: string;
  claimId: string;
  matchedAt: string;
  postedAt: string;
}>): RcmRemittanceRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(rcmRemittance)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(rcmRemittance.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findRemittanceById(id);
}

export function countAllRemittances(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(rcmRemittance).get();
  return result?.count ?? 0;
}
