/**
 * Revenue Summary Repository -- CFO Dashboard (BILLING-2)
 *
 * PG-backed SQL queries against claim_draft for 5 CFO metrics:
 *   1. netRevenue      -- total paid cents for the requested period
 *   2. collectionRate   -- paid / charged ratio
 *   3. denials          -- denied claims with reason codes, this week
 *   4. arAging          -- AR buckets: 0-30, 31-60, 61-90, 90+
 *   5. payerMix         -- distribution by payer_id/payer_name
 *
 * All queries include tenant_id WHERE clause for isolation.
 */

import { eq, and, gte, sql, count } from 'drizzle-orm';
import { getPgDb } from '../../platform/pg/pg-db.js';
import { claimDraft } from '../../platform/pg/pg-schema.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RevenueSummary {
  netRevenue: {
    totalChargeCents: number;
    totalPaidCents: number;
    totalAdjustmentCents: number;
    netRevenueCents: number;
    period: string;
  };
  collectionRate: {
    rate: number | null; // percentage 0-100
    paidClaimCount: number;
    totalClaimCount: number;
    period: string;
  };
  denials: {
    deniedCount: number;
    byReason: Array<{ code: string | null; reason: string | null; count: number }>;
    period: string;
  };
  arAging: {
    bucket_0_30: { count: number; totalCents: number };
    bucket_31_60: { count: number; totalCents: number };
    bucket_61_90: { count: number; totalCents: number };
    bucket_90_plus: { count: number; totalCents: number };
  };
  payerMix: Array<{
    payerId: string;
    payerName: string | null;
    claimCount: number;
    totalChargeCents: number;
    totalPaidCents: number;
    percentage: number;
  }>;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function periodStartDate(period: string): string {
  const now = new Date();
  switch (period) {
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.toISOString();
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), q, 1).toISOString();
    }
    case 'year':
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      // Default to month
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
}

/* ------------------------------------------------------------------ */
/* Main Query                                                          */
/* ------------------------------------------------------------------ */

export async function getRevenueSummary(
  tenantId: string,
  period: string = 'month'
): Promise<RevenueSummary> {
  const db = getPgDb();
  const periodStart = periodStartDate(period);

  // ── 1. Net Revenue ──────────────────────────────────────
  const revenueRows = await db
    .select({
      totalCharge: sql<number>`COALESCE(SUM(total_charge_cents), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(paid_amount_cents), 0)`,
      totalAdj: sql<number>`COALESCE(SUM(adjustment_cents), 0)`,
    })
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), gte(claimDraft.dateOfService, periodStart)));
  const rev = revenueRows[0] as any;
  const totalChargeCents = Number(rev?.totalCharge ?? 0);
  const totalPaidCents = Number(rev?.totalPaid ?? 0);
  const totalAdjCents = Number(rev?.totalAdj ?? 0);

  // ── 2. Collection Rate ──────────────────────────────────
  const countRows = await db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), gte(claimDraft.dateOfService, periodStart)));
  const totalClaimCount = Number((countRows[0] as any)?.cnt ?? 0);

  const paidCountRows = await db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(
      and(
        eq(claimDraft.tenantId, tenantId),
        eq(claimDraft.status, 'paid'),
        gte(claimDraft.dateOfService, periodStart)
      )
    );
  const paidClaimCount = Number((paidCountRows[0] as any)?.cnt ?? 0);

  const collectionRate =
    totalChargeCents > 0 ? Math.round((totalPaidCents / totalChargeCents) * 10000) / 100 : null;

  // ── 3. Denials (this week by default for CFO view) ──────
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const deniedRows = await db
    .select({ cnt: count() })
    .from(claimDraft)
    .where(
      and(
        eq(claimDraft.tenantId, tenantId),
        eq(claimDraft.status, 'denied'),
        gte(claimDraft.deniedAt, weekAgo)
      )
    );
  const deniedCount = Number((deniedRows[0] as any)?.cnt ?? 0);

  // Group by denial reason
  const denialReasonRows = await db
    .select({
      code: claimDraft.denialCode,
      reason: claimDraft.denialReason,
      cnt: count(),
    })
    .from(claimDraft)
    .where(
      and(
        eq(claimDraft.tenantId, tenantId),
        eq(claimDraft.status, 'denied'),
        gte(claimDraft.deniedAt, weekAgo)
      )
    )
    .groupBy(claimDraft.denialCode, claimDraft.denialReason);

  const byReason = denialReasonRows.map((r: any) => ({
    code: r.code ?? null,
    reason: r.reason ?? null,
    count: Number(r.cnt),
  }));

  // ── 4. AR Aging ─────────────────────────────────────────
  // Open claims (not paid, not closed) aged by date_of_service
  const arRows = await db
    .select({
      bucket: sql<string>`
        CASE
          WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 30 THEN '0-30'
          WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 60 THEN '31-60'
          WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 90 THEN '61-90'
          ELSE '90+'
        END`,
      cnt: count(),
      totalCharge: sql<number>`COALESCE(SUM(total_charge_cents), 0)`,
    })
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), sql`status NOT IN ('paid', 'closed')`))
    .groupBy(sql`CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 30 THEN '0-30'
      WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 60 THEN '31-60'
      WHEN EXTRACT(EPOCH FROM (NOW() - date_of_service::timestamp)) / 86400 <= 90 THEN '61-90'
      ELSE '90+'
    END`);

  const arBuckets: Record<string, { count: number; totalCents: number }> = {
    '0-30': { count: 0, totalCents: 0 },
    '31-60': { count: 0, totalCents: 0 },
    '61-90': { count: 0, totalCents: 0 },
    '90+': { count: 0, totalCents: 0 },
  };
  for (const row of arRows as any[]) {
    const key = row.bucket?.trim();
    if (key && arBuckets[key]) {
      arBuckets[key] = { count: Number(row.cnt), totalCents: Number(row.totalCharge) };
    }
  }

  // ── 5. Payer Mix ────────────────────────────────────────
  const payerRows = await db
    .select({
      payerId: claimDraft.payerId,
      payerName: claimDraft.payerName,
      cnt: count(),
      totalCharge: sql<number>`COALESCE(SUM(total_charge_cents), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(paid_amount_cents), 0)`,
    })
    .from(claimDraft)
    .where(and(eq(claimDraft.tenantId, tenantId), gte(claimDraft.dateOfService, periodStart)))
    .groupBy(claimDraft.payerId, claimDraft.payerName);

  const payerMix = (payerRows as any[]).map((r) => ({
    payerId: r.payerId,
    payerName: r.payerName ?? null,
    claimCount: Number(r.cnt),
    totalChargeCents: Number(r.totalCharge),
    totalPaidCents: Number(r.totalPaid),
    percentage:
      totalClaimCount > 0 ? Math.round((Number(r.cnt) / totalClaimCount) * 10000) / 100 : 0,
  }));

  log.debug('[revenue-summary] Computed revenue summary', {
    tenantId,
    period,
    totalClaimCount,
    deniedCount,
    payerCount: payerMix.length,
  });

  return {
    netRevenue: {
      totalChargeCents,
      totalPaidCents,
      totalAdjustmentCents: totalAdjCents,
      netRevenueCents: totalPaidCents,
      period,
    },
    collectionRate: {
      rate: collectionRate,
      paidClaimCount,
      totalClaimCount,
      period,
    },
    denials: {
      deniedCount,
      byReason,
      period: 'week',
    },
    arAging: {
      bucket_0_30: arBuckets['0-30'],
      bucket_31_60: arBuckets['31-60'],
      bucket_61_90: arBuckets['61-90'],
      bucket_90_plus: arBuckets['90+'],
    },
    payerMix,
  };
}
