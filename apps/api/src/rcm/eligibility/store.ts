/**
 * Phase 100 — Eligibility + Claim Status Durable Store
 *
 * PG-backed persistence for eligibility checks and claim status
 * checks. Replaces the in-memory ring buffers from Phase 69 with
 * durable storage that survives API restarts.
 */

import { randomUUID } from 'node:crypto';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { eligibilityCheck, claimStatusCheck } from '../../platform/pg/pg-schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import type {
  EligibilityCheckRecord,
  ClaimStatusCheckRecord,
  EligibilityStats,
  ClaimStatusStats,
} from './types.js';

/* ── Eligibility Check Store ────────────────────────────────── */

export async function insertEligibilityCheck(
  rec: Omit<EligibilityCheckRecord, 'id' | 'createdAt'>
): Promise<EligibilityCheckRecord> {
  const id = `elig-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const row = { id, createdAt, ...rec };
  await getPgDb()
    .insert(eligibilityCheck)
    .values({
      id: row.id,
      patientDfn: row.patientDfn,
      payerId: row.payerId,
      subscriberId: row.subscriberId,
      memberId: row.memberId,
      dateOfService: row.dateOfService ? new Date(row.dateOfService) : null,
      provenance: row.provenance,
      eligible: row.eligible,
      status: row.status,
      responseJson: row.responseJson,
      errorMessage: row.errorMessage,
      responseMs: row.responseMs,
      checkedBy: row.checkedBy,
      tenantId: row.tenantId,
      createdAt: new Date(row.createdAt),
    });
  return { ...row, id, createdAt };
}

export async function getEligibilityCheckById(
  tenantId: string,
  id: string
): Promise<EligibilityCheckRecord | null> {
  const rows = await getPgDb()
    .select()
    .from(eligibilityCheck)
    .where(and(eq(eligibilityCheck.tenantId, tenantId), eq(eligibilityCheck.id, id)));
  return rows[0] ? mapEligRow(rows[0]) : null;
}

export async function listEligibilityChecks(opts: {
  patientDfn?: string;
  payerId?: string;
  provenance?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: EligibilityCheckRecord[]; total: number }> {
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.patientDfn) conditions.push(eq(eligibilityCheck.patientDfn, opts.patientDfn));
  if (opts.payerId) conditions.push(eq(eligibilityCheck.payerId, opts.payerId));
  if (opts.provenance) conditions.push(eq(eligibilityCheck.provenance, opts.provenance));
  if (opts.tenantId) conditions.push(eq(eligibilityCheck.tenantId, opts.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const rows = await getPgDb()
    .select()
    .from(eligibilityCheck)
    .where(where)
    .orderBy(desc(eligibilityCheck.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(where);

  return {
    items: rows.map(mapEligRow),
    total: countRows[0]?.count ?? 0,
  };
}

export async function getEligibilityStats(tenantId?: string): Promise<EligibilityStats> {
  const where = tenantId ? eq(eligibilityCheck.tenantId, tenantId) : undefined;

  const totalRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(where);
  const completedRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(
      where
        ? and(where, eq(eligibilityCheck.status, 'completed'))
        : eq(eligibilityCheck.status, 'completed')
    );
  const failedRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(
      where
        ? and(where, eq(eligibilityCheck.status, 'failed'))
        : eq(eligibilityCheck.status, 'failed')
    );
  const eligibleResultRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(
      where ? and(where, eq(eligibilityCheck.eligible, true)) : eq(eligibilityCheck.eligible, true)
    );
  const ineligibleResultRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(
      where
        ? and(where, eq(eligibilityCheck.eligible, false))
        : eq(eligibilityCheck.eligible, false)
    );

  const avgMsRows = await getPgDb()
    .select({ avg: sql<number>`AVG(response_ms)` })
    .from(eligibilityCheck)
    .where(where);

  // By provenance
  const provRows = await getPgDb()
    .select({
      provenance: eligibilityCheck.provenance,
      count: sql<number>`count(*)`,
    })
    .from(eligibilityCheck)
    .where(where)
    .groupBy(eligibilityCheck.provenance);

  const byProvenance: Record<string, number> = {};
  for (const r of provRows) byProvenance[r.provenance] = r.count;

  const totalCount = totalRows[0]?.count ?? 0;
  const eligCount = eligibleResultRows[0]?.count ?? 0;
  const ineligCount = ineligibleResultRows[0]?.count ?? 0;

  return {
    totalChecks: totalCount,
    completedChecks: completedRows[0]?.count ?? 0,
    failedChecks: failedRows[0]?.count ?? 0,
    eligibleCount: eligCount,
    ineligibleCount: ineligCount,
    unknownCount: totalCount - eligCount - ineligCount,
    byProvenance,
    avgResponseMs: avgMsRows[0]?.avg ?? null,
  };
}

function mapEligRow(row: any): EligibilityCheckRecord {
  return {
    id: row.id,
    patientDfn: row.patientDfn,
    payerId: row.payerId,
    subscriberId: row.subscriberId ?? null,
    memberId: row.memberId ?? null,
    dateOfService: row.dateOfService ?? null,
    provenance: row.provenance,
    eligible: row.eligible ?? null,
    status: row.status,
    responseJson: row.responseJson ?? null,
    errorMessage: row.errorMessage ?? null,
    responseMs: row.responseMs ?? null,
    checkedBy: row.checkedBy ?? null,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
  };
}

/* ── Claim Status Check Store ───────────────────────────────── */

export async function insertClaimStatusCheck(
  rec: Omit<ClaimStatusCheckRecord, 'id' | 'createdAt'>
): Promise<ClaimStatusCheckRecord> {
  const id = `cstat-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const row = { id, createdAt, ...rec };
  await getPgDb()
    .insert(claimStatusCheck)
    .values({
      id: row.id,
      claimRef: row.claimRef,
      payerId: row.payerId,
      payerClaimId: row.payerClaimId,
      provenance: row.provenance,
      claimStatus: row.claimStatus,
      adjudicationDate: row.adjudicationDate ? new Date(row.adjudicationDate) : null,
      paidAmountCents: row.paidAmountCents,
      status: row.status,
      responseJson: row.responseJson,
      errorMessage: row.errorMessage,
      responseMs: row.responseMs,
      checkedBy: row.checkedBy,
      tenantId: row.tenantId,
      createdAt: new Date(row.createdAt),
    });
  return { ...row, id, createdAt };
}

export async function getClaimStatusCheckById(
  tenantId: string,
  id: string
): Promise<ClaimStatusCheckRecord | null> {
  const rows = await getPgDb()
    .select()
    .from(claimStatusCheck)
    .where(and(eq(claimStatusCheck.tenantId, tenantId), eq(claimStatusCheck.id, id)));
  return rows[0] ? mapCstatRow(rows[0]) : null;
}

export async function listClaimStatusChecks(opts: {
  claimRef?: string;
  payerId?: string;
  provenance?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ClaimStatusCheckRecord[]; total: number }> {
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.claimRef) conditions.push(eq(claimStatusCheck.claimRef, opts.claimRef));
  if (opts.payerId) conditions.push(eq(claimStatusCheck.payerId, opts.payerId));
  if (opts.provenance) conditions.push(eq(claimStatusCheck.provenance, opts.provenance));
  if (opts.tenantId) conditions.push(eq(claimStatusCheck.tenantId, opts.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const rows = await getPgDb()
    .select()
    .from(claimStatusCheck)
    .where(where)
    .orderBy(desc(claimStatusCheck.createdAt))
    .limit(limit)
    .offset(offset);

  const countRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck)
    .where(where);

  return {
    items: rows.map(mapCstatRow),
    total: countRows[0]?.count ?? 0,
  };
}

export async function getClaimStatusTimeline(
  claimRef: string,
  tenantId?: string
): Promise<ClaimStatusCheckRecord[]> {
  const conditions: ReturnType<typeof eq>[] = [eq(claimStatusCheck.claimRef, claimRef)];
  if (tenantId) conditions.push(eq(claimStatusCheck.tenantId, tenantId));

  const rows = await getPgDb()
    .select()
    .from(claimStatusCheck)
    .where(and(...conditions))
    .orderBy(desc(claimStatusCheck.createdAt));
  return rows.map(mapCstatRow);
}

export async function getClaimStatusStats(tenantId?: string): Promise<ClaimStatusStats> {
  const where = tenantId ? eq(claimStatusCheck.tenantId, tenantId) : undefined;

  const totalRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck)
    .where(where);
  const completedRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck)
    .where(
      where
        ? and(where, eq(claimStatusCheck.status, 'completed'))
        : eq(claimStatusCheck.status, 'completed')
    );
  const failedRows = await getPgDb()
    .select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck)
    .where(
      where
        ? and(where, eq(claimStatusCheck.status, 'failed'))
        : eq(claimStatusCheck.status, 'failed')
    );

  const avgMsRows = await getPgDb()
    .select({ avg: sql<number>`AVG(response_ms)` })
    .from(claimStatusCheck)
    .where(where);

  // By provenance
  const provRows = await getPgDb()
    .select({
      provenance: claimStatusCheck.provenance,
      count: sql<number>`count(*)`,
    })
    .from(claimStatusCheck)
    .where(where)
    .groupBy(claimStatusCheck.provenance);
  const byProvenance: Record<string, number> = {};
  for (const r of provRows) byProvenance[r.provenance] = r.count;

  // By claim status
  const statusRows = await getPgDb()
    .select({
      claimStatus: claimStatusCheck.claimStatus,
      count: sql<number>`count(*)`,
    })
    .from(claimStatusCheck)
    .where(where)
    .groupBy(claimStatusCheck.claimStatus);
  const byClaimStatus: Record<string, number> = {};
  for (const r of statusRows) {
    if (r.claimStatus) byClaimStatus[r.claimStatus] = r.count;
  }

  return {
    totalChecks: totalRows[0]?.count ?? 0,
    completedChecks: completedRows[0]?.count ?? 0,
    failedChecks: failedRows[0]?.count ?? 0,
    byProvenance,
    byClaimStatus,
    avgResponseMs: avgMsRows[0]?.avg ?? null,
  };
}

function mapCstatRow(row: any): ClaimStatusCheckRecord {
  return {
    id: row.id,
    claimRef: row.claimRef,
    payerId: row.payerId,
    payerClaimId: row.payerClaimId ?? null,
    provenance: row.provenance,
    claimStatus: row.claimStatus ?? null,
    adjudicationDate: row.adjudicationDate ?? null,
    paidAmountCents: row.paidAmountCents ?? null,
    status: row.status,
    responseJson: row.responseJson ?? null,
    errorMessage: row.errorMessage ?? null,
    responseMs: row.responseMs ?? null,
    checkedBy: row.checkedBy ?? null,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
  };
}
