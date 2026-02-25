/**
 * RCM Claim Case Repository — DB-backed durable claim lifecycle cases
 *
 * Phase 121: Durability Wave 1
 *
 * CRUD for the RCM claims lifecycle store (claims/claim-store.ts).
 * Complex fields (diagnoses, procedures, events, denials, attachments,
 * scrub history) stored as JSON columns in a single row per case.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { rcmClaimCase } from "../schema.js";

export type RcmClaimCaseRow = typeof rcmClaimCase.$inferSelect;

/* ── Create ────────────────────────────────────────────────── */

export function insertClaimCase(data: {
  id: string;
  tenantId: string;
  lifecycleStatus?: string;
  baseClaimId?: string;
  philhealthDraftId?: string;
  loaCaseId?: string;
  patientDfn: string;
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  subscriberId?: string;
  memberPin?: string;
  billingProviderNpi?: string;
  renderingProviderNpi?: string;
  facilityCode?: string;
  facilityName?: string;
  payerId: string;
  payerName?: string;
  payerType?: string;
  claimType?: string;
  dateOfService: string;
  dateOfDischarge?: string;
  diagnosesJson?: string;
  proceduresJson?: string;
  totalCharge?: number;
  scrubHistoryJson?: string;
  lastScrubResultJson?: string;
  attachmentsJson?: string;
  eventsJson?: string;
  denialsJson?: string;
  isDemo?: boolean;
  isMock?: boolean;
  priority?: string;
  vistaEncounterIen?: string;
  vistaChargeIen?: string;
  vistaArIen?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}): RcmClaimCaseRow {
  const db = getDb();
  db.insert(rcmClaimCase).values({
    id: data.id,
    tenantId: data.tenantId,
    lifecycleStatus: data.lifecycleStatus ?? "draft",
    baseClaimId: data.baseClaimId ?? null,
    philhealthDraftId: data.philhealthDraftId ?? null,
    loaCaseId: data.loaCaseId ?? null,
    patientDfn: data.patientDfn,
    patientName: data.patientName ?? null,
    patientDob: data.patientDob ?? null,
    patientGender: data.patientGender ?? null,
    subscriberId: data.subscriberId ?? null,
    memberPin: data.memberPin ?? null,
    billingProviderNpi: data.billingProviderNpi ?? null,
    renderingProviderNpi: data.renderingProviderNpi ?? null,
    facilityCode: data.facilityCode ?? null,
    facilityName: data.facilityName ?? null,
    payerId: data.payerId,
    payerName: data.payerName ?? null,
    payerType: data.payerType ?? null,
    claimType: data.claimType ?? "professional",
    dateOfService: data.dateOfService,
    dateOfDischarge: data.dateOfDischarge ?? null,
    diagnosesJson: data.diagnosesJson ?? "[]",
    proceduresJson: data.proceduresJson ?? "[]",
    totalCharge: data.totalCharge ?? 0,
    scrubHistoryJson: data.scrubHistoryJson ?? "[]",
    lastScrubResultJson: data.lastScrubResultJson ?? null,
    attachmentsJson: data.attachmentsJson ?? "[]",
    eventsJson: data.eventsJson ?? "[]",
    denialsJson: data.denialsJson ?? "[]",
    isDemo: data.isDemo ?? false,
    isMock: data.isMock ?? false,
    priority: data.priority ?? "medium",
    vistaEncounterIen: data.vistaEncounterIen ?? null,
    vistaChargeIen: data.vistaChargeIen ?? null,
    vistaArIen: data.vistaArIen ?? null,
    createdBy: data.createdBy ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }).run();
  return findClaimCaseById(data.id)!;
}

/* ── Lookup ────────────────────────────────────────────────── */

export function findClaimCaseById(id: string): RcmClaimCaseRow | undefined {
  const db = getDb();
  return db.select().from(rcmClaimCase).where(eq(rcmClaimCase.id, id)).get();
}

export function findClaimCasesByTenant(
  tenantId: string,
  opts?: { status?: string; patientDfn?: string; payerId?: string; limit?: number; offset?: number },
): RcmClaimCaseRow[] {
  const db = getDb();
  const conditions = [eq(rcmClaimCase.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(rcmClaimCase.lifecycleStatus, opts.status));
  if (opts?.patientDfn) conditions.push(eq(rcmClaimCase.patientDfn, opts.patientDfn));
  if (opts?.payerId) conditions.push(eq(rcmClaimCase.payerId, opts.payerId));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db.select().from(rcmClaimCase)
    .where(and(...conditions))
    .orderBy(desc(rcmClaimCase.updatedAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function countClaimCasesByTenant(tenantId: string): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` })
    .from(rcmClaimCase)
    .where(eq(rcmClaimCase.tenantId, tenantId))
    .get();
  return result?.count ?? 0;
}

/* ── Update ────────────────────────────────────────────────── */

export function updateClaimCase(id: string, updates: Partial<{
  lifecycleStatus: string;
  totalCharge: number;
  scrubHistoryJson: string;
  lastScrubResultJson: string;
  attachmentsJson: string;
  eventsJson: string;
  denialsJson: string;
  diagnosesJson: string;
  proceduresJson: string;
  priority: string;
}>): RcmClaimCaseRow | undefined {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.update(rcmClaimCase)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(rcmClaimCase.id, id))
    .run();
  if (result.changes === 0) return undefined;
  return findClaimCaseById(id);
}

/* ── Count ─────────────────────────────────────────────────── */

export function countAllClaimCases(): number {
  const db = getDb();
  const result = db.select({ count: sql<number>`count(*)` }).from(rcmClaimCase).get();
  return result?.count ?? 0;
}
