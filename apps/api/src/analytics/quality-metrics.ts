/**
 * Quality & Safety Metrics v1 — Phase 366 (W19-P5)
 *
 * Basic clinical quality measures computed on extract data.
 * These are engineering metrics, NOT regulatory certification claims.
 * Organizations must validate measures against their own clinical
 * workflows and regulatory requirements.
 */

import { randomUUID } from 'node:crypto';
import { log } from '../lib/logger.js';
import type {
  QualityMeasureId,
  QualityMeasure,
  QualityMetricRun,
  ReportRow,
  ReportResult,
  ReportId,
} from './extract-types.js';
import { getExtractRuns, getExtractRecords } from './extract-layer.js';
import { registerReportGenerator } from './reporting-service.js';

// ── Measure Definitions ─────────────────────────────────────────────────

const QUALITY_MEASURES: QualityMeasure[] = [
  {
    id: 'lab_followup_time',
    name: 'Abnormal Lab Follow-up Time',
    description: 'Average hours from abnormal lab result to provider follow-up action',
    unit: 'hours',
    target: 24,
    disclaimer: 'Engineering metric only. Not a certified clinical quality measure.',
  },
  {
    id: 'med_order_to_admin',
    name: 'Medication Order-to-Administration Time',
    description: 'Average minutes from medication order entry to first administration',
    unit: 'minutes',
    target: 60,
    disclaimer: 'Engineering metric only. Based on available order/admin timestamps.',
  },
  {
    id: 'note_completion_timeliness',
    name: 'Note Completion Timeliness',
    description: 'Average minutes from note creation to provider signature',
    unit: 'minutes',
    target: 120,
    disclaimer: 'Engineering metric only. Measures creation-to-signature gap.',
  },
];

// ── In-memory metric runs ───────────────────────────────────────────────

const metricRuns: QualityMetricRun[] = [];
const MAX_METRIC_RUNS = 500;

// ── Computation ─────────────────────────────────────────────────────────

export function getQualityMeasures(): QualityMeasure[] {
  return [...QUALITY_MEASURES];
}

export function getQualityMeasure(id: QualityMeasureId): QualityMeasure | undefined {
  return QUALITY_MEASURES.find((m) => m.id === id);
}

/**
 * Compute a quality metric for a tenant.
 * Uses the latest extract run's data.
 */
export function computeQualityMetric(
  measureId: QualityMeasureId,
  tenantId: string,
  periodStart?: string,
  periodEnd?: string
): QualityMetricRun {
  const measure = QUALITY_MEASURES.find((m) => m.id === measureId);
  if (!measure) throw new Error(`Unknown measure: ${measureId}`);

  const runs = getExtractRuns(tenantId, 10);
  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;

  if (!latestRun) {
    return makeMetricRun(measureId, tenantId, periodStart, periodEnd, {
      value: 0,
      sampleSize: 0,
      inputRefs: [],
      status: 'insufficient_data',
    });
  }

  const computer = METRIC_COMPUTERS[measureId];
  if (!computer) {
    return makeMetricRun(measureId, tenantId, periodStart, periodEnd, {
      value: 0,
      sampleSize: 0,
      inputRefs: [latestRun.runId],
      status: 'error',
    });
  }

  const result = computer(tenantId, latestRun.runId);
  const run = makeMetricRun(measureId, tenantId, periodStart, periodEnd, {
    ...result,
    inputRefs: [latestRun.runId],
    status: result.sampleSize > 0 ? 'computed' : 'insufficient_data',
  });

  metricRuns.push(run);
  if (metricRuns.length > MAX_METRIC_RUNS) metricRuns.shift();

  log.info(`Quality metric ${measureId}: value=${run.value}, n=${run.sampleSize}`);
  return run;
}

export function computeAllMetrics(tenantId: string): QualityMetricRun[] {
  return QUALITY_MEASURES.map((m) => computeQualityMetric(m.id, tenantId));
}

export function getMetricRuns(
  tenantId: string,
  measureId?: QualityMeasureId,
  limit = 50
): QualityMetricRun[] {
  let filtered = metricRuns.filter((r) => r.tenantId === tenantId);
  if (measureId) filtered = filtered.filter((r) => r.measureId === measureId);
  return filtered.slice(-limit);
}

// ── Metric Computers ────────────────────────────────────────────────────

type MetricComputer = (
  tenantId: string,
  runId: string
) => {
  value: number;
  sampleSize: number;
};

const METRIC_COMPUTERS: Record<QualityMeasureId, MetricComputer> = {
  lab_followup_time: (tenantId, runId) => {
    const records = getExtractRecords(runId, { entityType: 'lab_result' });
    const abnormal = records.filter((r) => r.data.result === 'abnormal' && r.data.followupAt);
    if (abnormal.length === 0) return { value: 0, sampleSize: 0 };

    const followupHours = abnormal.map((r) => {
      const resulted = new Date(r.data.resultedAt as string).getTime();
      const followup = new Date(r.data.followupAt as string).getTime();
      return (followup - resulted) / 3600_000;
    });
    const avg = followupHours.reduce((a, b) => a + b, 0) / followupHours.length;
    return { value: Number(avg.toFixed(1)), sampleSize: abnormal.length };
  },

  med_order_to_admin: (tenantId, runId) => {
    const records = getExtractRecords(runId, { entityType: 'medication_order' });
    const withAdmin = records.filter((r) => r.data.orderToAdminMin != null);
    if (withAdmin.length === 0) return { value: 0, sampleSize: 0 };

    const times = withAdmin.map((r) => r.data.orderToAdminMin as number);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return { value: Number(avg.toFixed(0)), sampleSize: withAdmin.length };
  },

  note_completion_timeliness: (tenantId, runId) => {
    const records = getExtractRecords(runId, { entityType: 'note' });
    const withSignature = records.filter((r) => r.data.completionMin != null);
    if (withSignature.length === 0) return { value: 0, sampleSize: 0 };

    const times = withSignature.map((r) => r.data.completionMin as number);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return { value: Number(avg.toFixed(0)), sampleSize: withSignature.length };
  },
};

// ── Report Generator Registration ───────────────────────────────────────

function qualityToReportResult(
  reportId: ReportId,
  tenantId: string,
  params: Record<string, unknown>,
  measureId: QualityMeasureId
): ReportResult {
  const metric = computeQualityMetric(measureId, tenantId, params.startDate as string);
  const measure = QUALITY_MEASURES.find((m) => m.id === measureId)!;
  const rows: ReportRow[] = [
    {
      measure: measure.name,
      value: metric.value,
      unit: measure.unit,
      target: measure.target ?? 'N/A',
      sampleSize: metric.sampleSize,
      status: metric.status,
      disclaimer: measure.disclaimer,
    },
  ];
  return {
    reportId,
    tenantId,
    generatedAt: new Date().toISOString(),
    parameters: params,
    data: rows,
    summary: {
      value: metric.value,
      unit: measure.unit,
      status: metric.status,
      sampleSize: metric.sampleSize,
    },
    totalRows: rows.length,
  };
}

/**
 * Register quality metric generators with the reporting service.
 * Called at module init.
 */
export function initQualityReportGenerators(): void {
  registerReportGenerator('quality_lab_followup', (t, p) =>
    qualityToReportResult('quality_lab_followup', t, p, 'lab_followup_time')
  );
  registerReportGenerator('quality_med_admin', (t, p) =>
    qualityToReportResult('quality_med_admin', t, p, 'med_order_to_admin')
  );
  registerReportGenerator('quality_note_completion', (t, p) =>
    qualityToReportResult('quality_note_completion', t, p, 'note_completion_timeliness')
  );
  log.info('Quality report generators registered (Phase 366)');
}

// ── Helpers ─────────────────────────────────────────────────────────────

function makeMetricRun(
  measureId: QualityMeasureId,
  tenantId: string,
  periodStart?: string,
  periodEnd?: string,
  overrides?: Partial<QualityMetricRun>
): QualityMetricRun {
  const now = new Date().toISOString();
  return {
    runId: randomUUID(),
    measureId,
    tenantId,
    computedAt: now,
    periodStart: periodStart || new Date(Date.now() - 7 * 86400_000).toISOString(),
    periodEnd: periodEnd || now,
    value: 0,
    sampleSize: 0,
    inputRefs: [],
    status: 'computed',
    ...overrides,
  };
}
