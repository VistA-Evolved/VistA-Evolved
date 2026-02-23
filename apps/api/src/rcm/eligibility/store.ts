/**
 * Phase 100 — Eligibility + Claim Status Durable Store
 *
 * SQLite-backed persistence for eligibility checks and claim status
 * checks. Replaces the in-memory ring buffers from Phase 69 with
 * durable storage that survives API restarts.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../../platform/db/db.js";
import { eligibilityCheck, claimStatusCheck } from "../../platform/db/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import type {
  EligibilityCheckRecord,
  ClaimStatusCheckRecord,
  EligibilityStats,
  ClaimStatusStats,
} from "./types.js";

/* ── Eligibility Check Store ────────────────────────────────── */

export function insertEligibilityCheck(rec: Omit<EligibilityCheckRecord, "id" | "createdAt">): EligibilityCheckRecord {
  const id = `elig-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const row = { id, createdAt, ...rec };
  getDb().insert(eligibilityCheck).values({
    id: row.id,
    patientDfn: row.patientDfn,
    payerId: row.payerId,
    subscriberId: row.subscriberId,
    memberId: row.memberId,
    dateOfService: row.dateOfService,
    provenance: row.provenance,
    eligible: row.eligible,
    status: row.status,
    responseJson: row.responseJson,
    errorMessage: row.errorMessage,
    responseMs: row.responseMs,
    checkedBy: row.checkedBy,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
  }).run();
  return { ...row, id, createdAt };
}

export function getEligibilityCheckById(id: string): EligibilityCheckRecord | null {
  const row = getDb().select().from(eligibilityCheck).where(eq(eligibilityCheck.id, id)).get();
  return row ? mapEligRow(row) : null;
}

export function listEligibilityChecks(opts: {
  patientDfn?: string;
  payerId?: string;
  provenance?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { items: EligibilityCheckRecord[]; total: number } {
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.patientDfn) conditions.push(eq(eligibilityCheck.patientDfn, opts.patientDfn));
  if (opts.payerId) conditions.push(eq(eligibilityCheck.payerId, opts.payerId));
  if (opts.provenance) conditions.push(eq(eligibilityCheck.provenance, opts.provenance));
  if (opts.tenantId) conditions.push(eq(eligibilityCheck.tenantId, opts.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const rows = getDb().select().from(eligibilityCheck)
    .where(where)
    .orderBy(desc(eligibilityCheck.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck)
    .where(where)
    .get();

  return {
    items: rows.map(mapEligRow),
    total: countResult?.count ?? 0,
  };
}

export function getEligibilityStats(tenantId?: string): EligibilityStats {
  const where = tenantId ? eq(eligibilityCheck.tenantId, tenantId) : undefined;

  const total = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck).where(where).get();
  const completed = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck).where(where ? and(where, eq(eligibilityCheck.status, "completed")) : eq(eligibilityCheck.status, "completed")).get();
  const failed = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck).where(where ? and(where, eq(eligibilityCheck.status, "failed")) : eq(eligibilityCheck.status, "failed")).get();
  const eligibleRows = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck).where(where ? and(where, eq(eligibilityCheck.eligible, true)) : eq(eligibilityCheck.eligible, true)).get();
  const ineligibleRows = getDb().select({ count: sql<number>`count(*)` })
    .from(eligibilityCheck).where(where ? and(where, eq(eligibilityCheck.eligible, false)) : eq(eligibilityCheck.eligible, false)).get();

  const avgMs = getDb().select({ avg: sql<number>`AVG(response_ms)` })
    .from(eligibilityCheck).where(where).get();

  // By provenance
  const provRows = getDb().select({
    provenance: eligibilityCheck.provenance,
    count: sql<number>`count(*)`,
  }).from(eligibilityCheck).where(where).groupBy(eligibilityCheck.provenance).all();

  const byProvenance: Record<string, number> = {};
  for (const r of provRows) byProvenance[r.provenance] = r.count;

  const totalCount = total?.count ?? 0;
  const eligCount = eligibleRows?.count ?? 0;
  const ineligCount = ineligibleRows?.count ?? 0;

  return {
    totalChecks: totalCount,
    completedChecks: completed?.count ?? 0,
    failedChecks: failed?.count ?? 0,
    eligibleCount: eligCount,
    ineligibleCount: ineligCount,
    unknownCount: totalCount - eligCount - ineligCount,
    byProvenance,
    avgResponseMs: avgMs?.avg ?? null,
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

export function insertClaimStatusCheck(rec: Omit<ClaimStatusCheckRecord, "id" | "createdAt">): ClaimStatusCheckRecord {
  const id = `cstat-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const row = { id, createdAt, ...rec };
  getDb().insert(claimStatusCheck).values({
    id: row.id,
    claimRef: row.claimRef,
    payerId: row.payerId,
    payerClaimId: row.payerClaimId,
    provenance: row.provenance,
    claimStatus: row.claimStatus,
    adjudicationDate: row.adjudicationDate,
    paidAmountCents: row.paidAmountCents,
    status: row.status,
    responseJson: row.responseJson,
    errorMessage: row.errorMessage,
    responseMs: row.responseMs,
    checkedBy: row.checkedBy,
    tenantId: row.tenantId,
    createdAt: row.createdAt,
  }).run();
  return { ...row, id, createdAt };
}

export function getClaimStatusCheckById(id: string): ClaimStatusCheckRecord | null {
  const row = getDb().select().from(claimStatusCheck).where(eq(claimStatusCheck.id, id)).get();
  return row ? mapCstatRow(row) : null;
}

export function listClaimStatusChecks(opts: {
  claimRef?: string;
  payerId?: string;
  provenance?: string;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { items: ClaimStatusCheckRecord[]; total: number } {
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.claimRef) conditions.push(eq(claimStatusCheck.claimRef, opts.claimRef));
  if (opts.payerId) conditions.push(eq(claimStatusCheck.payerId, opts.payerId));
  if (opts.provenance) conditions.push(eq(claimStatusCheck.provenance, opts.provenance));
  if (opts.tenantId) conditions.push(eq(claimStatusCheck.tenantId, opts.tenantId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;

  const rows = getDb().select().from(claimStatusCheck)
    .where(where)
    .orderBy(desc(claimStatusCheck.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = getDb().select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck)
    .where(where)
    .get();

  return {
    items: rows.map(mapCstatRow),
    total: countResult?.count ?? 0,
  };
}

export function getClaimStatusTimeline(claimRef: string, tenantId?: string): ClaimStatusCheckRecord[] {
  const conditions: ReturnType<typeof eq>[] = [eq(claimStatusCheck.claimRef, claimRef)];
  if (tenantId) conditions.push(eq(claimStatusCheck.tenantId, tenantId));

  return getDb().select().from(claimStatusCheck)
    .where(and(...conditions))
    .orderBy(desc(claimStatusCheck.createdAt))
    .all()
    .map(mapCstatRow);
}

export function getClaimStatusStats(tenantId?: string): ClaimStatusStats {
  const where = tenantId ? eq(claimStatusCheck.tenantId, tenantId) : undefined;

  const total = getDb().select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck).where(where).get();
  const completed = getDb().select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck).where(where ? and(where, eq(claimStatusCheck.status, "completed")) : eq(claimStatusCheck.status, "completed")).get();
  const failed = getDb().select({ count: sql<number>`count(*)` })
    .from(claimStatusCheck).where(where ? and(where, eq(claimStatusCheck.status, "failed")) : eq(claimStatusCheck.status, "failed")).get();

  const avgMs = getDb().select({ avg: sql<number>`AVG(response_ms)` })
    .from(claimStatusCheck).where(where).get();

  // By provenance
  const provRows = getDb().select({
    provenance: claimStatusCheck.provenance,
    count: sql<number>`count(*)`,
  }).from(claimStatusCheck).where(where).groupBy(claimStatusCheck.provenance).all();
  const byProvenance: Record<string, number> = {};
  for (const r of provRows) byProvenance[r.provenance] = r.count;

  // By claim status
  const statusRows = getDb().select({
    claimStatus: claimStatusCheck.claimStatus,
    count: sql<number>`count(*)`,
  }).from(claimStatusCheck).where(where).groupBy(claimStatusCheck.claimStatus).all();
  const byClaimStatus: Record<string, number> = {};
  for (const r of statusRows) {
    if (r.claimStatus) byClaimStatus[r.claimStatus] = r.count;
  }

  return {
    totalChecks: total?.count ?? 0,
    completedChecks: completed?.count ?? 0,
    failedChecks: failed?.count ?? 0,
    byProvenance,
    byClaimStatus,
    avgResponseMs: avgMs?.avg ?? null,
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
