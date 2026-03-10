/**
 * Aging + Payer Intelligence (Phase 92)
 *
 * - Aging: compute outstanding AR aging buckets (0-30, 31-60, 61-90, 91-120, >120)
 * - Payer KPIs: avg days to payment, denial rate, return rate, underpayment rate
 *
 * All computations are tenant-scoped and derived from ClaimCase + payment data.
 */

import type {
  AgingBucket,
  AgingReport,
  PayerKPI,
  PayerIntelligenceReport,
} from './payment-types.js';
import { listClaimCases } from '../claims/claim-store.js';
import type { ClaimCase } from '../claims/claim-types.js';
import { listUnderpayments } from './payment-store.js';

/* -- Aging Buckets ------------------------------------------- */

const AGING_BUCKET_DEFS: Array<{ label: string; minDays: number; maxDays: number | null }> = [
  { label: '0-30 days', minDays: 0, maxDays: 30 },
  { label: '31-60 days', minDays: 31, maxDays: 60 },
  { label: '61-90 days', minDays: 61, maxDays: 90 },
  { label: '91-120 days', minDays: 91, maxDays: 120 },
  { label: '>120 days', minDays: 121, maxDays: null },
];

/**
 * Compute aging report for a tenant.
 * A claim is "outstanding" if it's been submitted but not yet paid/closed/cancelled.
 */
export async function computeAging(tenantId: string): Promise<AgingReport> {
  const now = new Date();
  const { items } = await listClaimCases({ tenantId, limit: 10000 });

  const outstandingStatuses = new Set([
    'submitted_electronic',
    'submitted_portal',
    'submitted_manual',
    'exported',
    'payer_acknowledged',
    'appeal_in_progress',
    'paid_partial',
    'returned_to_provider',
  ]);

  const outstandingClaims = items.filter((c) => outstandingStatuses.has(c.lifecycleStatus));

  const buckets: AgingBucket[] = AGING_BUCKET_DEFS.map((def) => ({
    ...def,
    claimCount: 0,
    totalOutstanding: 0,
  }));

  let totalOutstanding = 0;

  for (const claim of outstandingClaims) {
    const submitDate = claim.submittedAt ? new Date(claim.submittedAt) : new Date(claim.updatedAt);
    const daysSinceSubmit = Math.floor(
      (now.getTime() - submitDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const outstanding = claim.totalCharge - (claim.paidAmount ?? 0);
    totalOutstanding += outstanding;

    for (const bucket of buckets) {
      if (
        daysSinceSubmit >= bucket.minDays &&
        (bucket.maxDays === null || daysSinceSubmit <= bucket.maxDays)
      ) {
        bucket.claimCount++;
        bucket.totalOutstanding += outstanding;
        break;
      }
    }
  }

  return {
    tenantId,
    generatedAt: now.toISOString(),
    buckets,
    totalOutstanding,
    totalClaims: outstandingClaims.length,
  };
}

/* -- Payer Intelligence -------------------------------------- */

/**
 * Compute KPIs for all payers with activity within a period.
 */
export async function computePayerIntelligence(
  tenantId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<PayerIntelligenceReport> {
  const now = new Date();
  const start = periodStart ?? new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
  const end = periodEnd ?? now.toISOString();

  const { items: allClaims } = await listClaimCases({ tenantId, limit: 10000 });

  // Filter by period (createdAt within range)
  const periodClaims = allClaims.filter((c) => c.createdAt >= start && c.createdAt <= end);

  // Group by payerId
  const payerGroups = new Map<string, ClaimCase[]>();
  for (const claim of periodClaims) {
    if (!payerGroups.has(claim.payerId)) payerGroups.set(claim.payerId, []);
    payerGroups.get(claim.payerId)!.push(claim);
  }

  // Get underpayments for tenant
  const { items: underpaymentItems } = listUnderpayments({ tenantId, limit: 10000 });
  const underpaymentsByPayer = new Map<string, number>();
  for (const u of underpaymentItems) {
    underpaymentsByPayer.set(u.payerId, (underpaymentsByPayer.get(u.payerId) ?? 0) + 1);
  }

  const payers: PayerKPI[] = [];

  for (const [payerId, claims] of payerGroups) {
    const totalClaims = claims.length;
    const paidClaims = claims.filter(
      (c) =>
        c.lifecycleStatus === 'paid_full' ||
        c.lifecycleStatus === 'paid_partial' ||
        c.lifecycleStatus === 'closed'
    );
    const deniedClaims = claims.filter((c) => c.lifecycleStatus === 'denied');
    const returnedClaims = claims.filter((c) => c.lifecycleStatus === 'returned_to_provider');

    // Days to payment: from submittedAt to remitDate
    const daysToPayment: number[] = [];
    for (const claim of paidClaims) {
      if (claim.submittedAt && claim.remitDate) {
        const days = Math.floor(
          (new Date(claim.remitDate).getTime() - new Date(claim.submittedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (days >= 0) daysToPayment.push(days);
      }
    }

    const avgDays =
      daysToPayment.length > 0
        ? Math.round(daysToPayment.reduce((a, b) => a + b, 0) / daysToPayment.length)
        : null;

    const medianDays = daysToPayment.length > 0 ? computeMedian(daysToPayment) : null;

    const totalUnderpaid = underpaymentsByPayer.get(payerId) ?? 0;

    payers.push({
      payerId,
      payerName: claims[0]?.payerName,
      avgDaysToPayment: avgDays,
      medianDaysToPayment: medianDays,
      denialRate: totalClaims > 0 ? round2(deniedClaims.length / totalClaims) : 0,
      returnRate: totalClaims > 0 ? round2(returnedClaims.length / totalClaims) : 0,
      underpaymentRate: paidClaims.length > 0 ? round2(totalUnderpaid / paidClaims.length) : 0,
      totalClaims,
      totalPaid: paidClaims.length,
      totalDenied: deniedClaims.length,
      totalUnderpaid,
      periodStart: start,
      periodEnd: end,
    });
  }

  // Sort by total claims desc
  payers.sort((a, b) => b.totalClaims - a.totalClaims);

  return {
    tenantId,
    generatedAt: now.toISOString(),
    payers,
    periodStart: start,
    periodEnd: end,
  };
}

/* -- Helpers ------------------------------------------------- */

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function round2(n: number): number {
  return Math.round(n * 10000) / 10000; // 4 decimal places for rates
}
