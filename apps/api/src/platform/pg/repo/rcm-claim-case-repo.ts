/**
 * PG RCM Claim Case Repository -- Async durable claim lifecycle cases
 *
 * Phase 126: RCM Durability Wave (Map stores -> Postgres)
 *
 * Mirrors the SQLite rcm-claim-case-repo function signatures but returns Promises.
 * Uses Drizzle ORM + pg-core for type-safe queries.
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgRcmClaimCase } from '../pg-schema.js';

export type RcmClaimCaseRow = typeof pgRcmClaimCase.$inferSelect;

/* -- Create -------------------------------------------------- */

export async function insertClaimCase(data: {
  id: string;
  tenantId: string;
  lifecycleStatus?: string;
  baseClaimId?: string;
  philhealthDraftId?: string;
  loaCaseId?: string;
  patientDfn: string;
  patientName?: string;
  payerId?: string;
  payerName?: string;
  providerDuz?: string;
  providerName?: string;
  encounterDate?: string;
  diagnosesJson?: string;
  proceduresJson?: string;
  scrubResultJson?: string;
  scrubScore?: number;
  eventsJson?: string;
  attachmentsJson?: string;
  denialsJson?: string;
  notesJson?: string;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
}): Promise<RcmClaimCaseRow> {
  const db = getPgDb();
  await db.insert(pgRcmClaimCase).values({
    id: data.id,
    tenantId: data.tenantId,
    lifecycleStatus: data.lifecycleStatus ?? 'intake',
    baseClaimId: data.baseClaimId ?? null,
    philhealthDraftId: data.philhealthDraftId ?? null,
    loaCaseId: data.loaCaseId ?? null,
    patientDfn: data.patientDfn,
    patientName: data.patientName ?? null,
    payerId: data.payerId ?? null,
    payerName: data.payerName ?? null,
    providerDuz: data.providerDuz ?? null,
    providerName: data.providerName ?? null,
    encounterDate: data.encounterDate ?? null,
    diagnosesJson: data.diagnosesJson ?? '[]',
    proceduresJson: data.proceduresJson ?? '[]',
    scrubResultJson: data.scrubResultJson ?? null,
    scrubScore: data.scrubScore ?? null,
    eventsJson: data.eventsJson ?? '[]',
    attachmentsJson: data.attachmentsJson ?? '[]',
    denialsJson: data.denialsJson ?? '[]',
    notesJson: data.notesJson ?? '[]',
    metadataJson: data.metadataJson ?? '{}',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
  const row = await findClaimCaseById(data.id);
  return row!;
}

/* -- Lookup -------------------------------------------------- */

export async function findClaimCaseById(id: string): Promise<RcmClaimCaseRow | undefined> {
  const db = getPgDb();
  const rows = await db.select().from(pgRcmClaimCase).where(eq(pgRcmClaimCase.id, id));
  return rows[0];
}

export async function findClaimCasesByTenant(
  tenantId: string,
  opts?: { status?: string; patientDfn?: string; payerId?: string; limit?: number; offset?: number }
): Promise<RcmClaimCaseRow[]> {
  const db = getPgDb();
  const conditions = [eq(pgRcmClaimCase.tenantId, tenantId)];
  if (opts?.status) conditions.push(eq(pgRcmClaimCase.lifecycleStatus, opts.status));
  if (opts?.patientDfn) conditions.push(eq(pgRcmClaimCase.patientDfn, opts.patientDfn));
  if (opts?.payerId) conditions.push(eq(pgRcmClaimCase.payerId!, opts.payerId));

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  return db
    .select()
    .from(pgRcmClaimCase)
    .where(and(...conditions))
    .orderBy(desc(pgRcmClaimCase.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function countClaimCasesByTenant(tenantId: string): Promise<number> {
  const db = getPgDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pgRcmClaimCase)
    .where(eq(pgRcmClaimCase.tenantId, tenantId));
  return result[0]?.count ?? 0;
}

/* -- Update -------------------------------------------------- */

export async function updateClaimCase(
  id: string,
  updates: Partial<{
    lifecycleStatus: string;
    scrubResultJson: string;
    scrubScore: number;
    eventsJson: string;
    attachmentsJson: string;
    denialsJson: string;
    notesJson: string;
    diagnosesJson: string;
    proceduresJson: string;
    metadataJson: string;
  }>
): Promise<RcmClaimCaseRow | undefined> {
  const db = getPgDb();
  const now = new Date().toISOString();
  await db
    .update(pgRcmClaimCase)
    .set({ ...updates, updatedAt: now } as any)
    .where(eq(pgRcmClaimCase.id, id));
  return findClaimCaseById(id);
}

/* -- Count --------------------------------------------------- */

export async function countAllClaimCases(): Promise<number> {
  const db = getPgDb();
  const result = await db.select({ count: sql<number>`count(*)` }).from(pgRcmClaimCase);
  return result[0]?.count ?? 0;
}
