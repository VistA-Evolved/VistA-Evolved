/**
 * RCM Analytics v1 — Phase 367 (W19-P6)
 *
 * Revenue cycle management analytics: claim throughput, denial
 * distribution, days-in-AR, and acknowledgement reject rates.
 * Reads from the RCM claim store and extract layer.
 */

import { log } from '../lib/logger.js';
import type { ReportId, ReportResult, ReportRow } from './extract-types.js';
import { getExtractRuns, getExtractRecords } from './extract-layer.js';
import { registerReportGenerator } from './reporting-service.js';

// ── RCM Metric Computation ──────────────────────────────────────────────

interface RcmMetricResult {
  value: number;
  sampleSize: number;
  breakdown: Record<string, number>;
}

/**
 * Claim throughput: claims processed per day over the given window.
 */
function computeClaimThroughput(tenantId: string, runId: string): RcmMetricResult {
  const records = getExtractRecords(runId, { entityType: 'claim' });
  if (records.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const byStatus: Record<string, number> = {};
  for (const r of records) {
    const s = (r.data.status ?? 'unknown') as string;
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  // Estimate throughput as total claims / 7 (assume 7-day window)
  const dayWindow = 7;
  const throughput = Number((records.length / dayWindow).toFixed(1));
  return { value: throughput, sampleSize: records.length, breakdown: byStatus };
}

/**
 * Denial distribution: percentage of claims denied, grouped by denial reason.
 */
function computeDenialDistribution(tenantId: string, runId: string): RcmMetricResult {
  const records = getExtractRecords(runId, { entityType: 'claim' });
  if (records.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const denied = records.filter((r) => r.data.status === 'denied' || r.data.status === 'rejected');
  const byReason: Record<string, number> = {};
  for (const d of denied) {
    const reason = (d.data.denialReason ?? 'unspecified') as string;
    byReason[reason] = (byReason[reason] || 0) + 1;
  }

  const denialRate =
    records.length > 0 ? Number(((denied.length / records.length) * 100).toFixed(1)) : 0;
  return { value: denialRate, sampleSize: records.length, breakdown: byReason };
}

/**
 * Days-in-AR: average days a claim remains in accounts receivable.
 */
function computeDaysInAR(tenantId: string, runId: string): RcmMetricResult {
  const records = getExtractRecords(runId, { entityType: 'claim' });
  if (records.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const arRecords = records.filter((r) => r.data.daysInAR != null);
  if (arRecords.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const buckets: Record<string, number> = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '91-120': 0,
    '120+': 0,
  };
  let totalDays = 0;
  for (const r of arRecords) {
    const d = r.data.daysInAR as number;
    totalDays += d;
    if (d <= 30) buckets['0-30']++;
    else if (d <= 60) buckets['31-60']++;
    else if (d <= 90) buckets['61-90']++;
    else if (d <= 120) buckets['91-120']++;
    else buckets['120+']++;
  }

  const avg = Number((totalDays / arRecords.length).toFixed(1));
  return { value: avg, sampleSize: arRecords.length, breakdown: buckets };
}

/**
 * Acknowledgement reject rate from EDI pipeline data.
 */
function computeAckRejectRate(tenantId: string, runId: string): RcmMetricResult {
  const records = getExtractRecords(runId, { entityType: 'claim' });
  if (records.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const withAck = records.filter((r) => r.data.ackStatus != null);
  if (withAck.length === 0) return { value: 0, sampleSize: 0, breakdown: {} };

  const byAck: Record<string, number> = {};
  for (const r of withAck) {
    const s = (r.data.ackStatus ?? 'unknown') as string;
    byAck[s] = (byAck[s] || 0) + 1;
  }

  const rejected = withAck.filter(
    (r) => r.data.ackStatus === 'rejected' || r.data.ackStatus === 'R'
  );
  const rejectRate = Number(((rejected.length / withAck.length) * 100).toFixed(1));
  return { value: rejectRate, sampleSize: withAck.length, breakdown: byAck };
}

// ── Report Generator Registration ───────────────────────────────────────

type RcmComputer = (tenantId: string, runId: string) => RcmMetricResult;

const RCM_COMPUTERS: Record<string, { computer: RcmComputer; unit: string; label: string }> = {
  rcm_claim_throughput: {
    computer: computeClaimThroughput,
    unit: 'claims/day',
    label: 'Claim Throughput',
  },
  rcm_denial_distribution: {
    computer: computeDenialDistribution,
    unit: '% denied',
    label: 'Denial Distribution',
  },
  rcm_days_in_ar: {
    computer: computeDaysInAR,
    unit: 'days',
    label: 'Average Days in AR',
  },
  rcm_ack_reject_rate: {
    computer: computeAckRejectRate,
    unit: '% rejected',
    label: 'Acknowledgement Reject Rate',
  },
};

function rcmToReportResult(
  reportId: ReportId,
  tenantId: string,
  params: Record<string, unknown>,
  computerKey: string
): ReportResult {
  const def = RCM_COMPUTERS[computerKey];
  if (!def) throw new Error(`Unknown RCM computer: ${computerKey}`);

  const runs = getExtractRuns(tenantId, 10);
  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;

  if (!latestRun) {
    return {
      reportId,
      tenantId,
      generatedAt: new Date().toISOString(),
      parameters: params,
      data: [],
      summary: { label: def.label, value: 0, unit: def.unit, status: 'no_extract_data' },
      totalRows: 0,
    };
  }

  const result = def.computer(tenantId, latestRun.runId);
  const rows: ReportRow[] = [
    {
      metric: def.label,
      value: result.value,
      unit: def.unit,
      sampleSize: result.sampleSize,
    },
    ...Object.entries(result.breakdown).map(([k, v]) => ({
      bucket: k,
      count: v,
    })),
  ];

  return {
    reportId,
    tenantId,
    generatedAt: new Date().toISOString(),
    parameters: params,
    data: rows,
    summary: {
      label: def.label,
      value: result.value,
      unit: def.unit,
      sampleSize: result.sampleSize,
    },
    totalRows: rows.length,
  };
}

/**
 * Register RCM analytics generators with the reporting service.
 */
export function initRcmReportGenerators(): void {
  for (const key of Object.keys(RCM_COMPUTERS)) {
    registerReportGenerator(key as ReportId, (t, p) =>
      rcmToReportResult(key as ReportId, t, p, key)
    );
  }
  log.info('RCM report generators registered (Phase 367)');
}

// ── Direct query API ────────────────────────────────────────────────────

export function computeRcmMetric(
  metricKey: string,
  tenantId: string
): { metric: string; result: RcmMetricResult } | null {
  const def = RCM_COMPUTERS[metricKey];
  if (!def) return null;

  const runs = getExtractRuns(tenantId, 10);
  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
  if (!latestRun) {
    return { metric: metricKey, result: { value: 0, sampleSize: 0, breakdown: {} } };
  }

  return { metric: metricKey, result: def.computer(tenantId, latestRun.runId) };
}

export function listRcmMetrics(): string[] {
  return Object.keys(RCM_COMPUTERS);
}
