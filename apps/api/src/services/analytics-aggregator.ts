/**
 * Analytics Aggregation Engine — Phase 25.
 *
 * Produces hourly and daily metric summaries from the analytics event stream.
 * All output is aggregated (no individual-level data, no PHI).
 *
 * The aggregator runs on a configurable interval (default: 1 hour) and
 * produces MetricBucket entries that power dashboards and SQL tables.
 *
 * Per data classification: only counts, averages, percentiles, and rates.
 * NEVER direct patient identifiers.
 */

import { log } from "../lib/logger.js";
import { ANALYTICS_AGGREGATION_CONFIG } from "../config/analytics-config.js";
import {
  queryAnalyticsEvents,
  type AnalyticsEventCategory,
} from "./analytics-store.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export type AggregationPeriod = "hourly" | "daily";

/**
 * A single aggregated metric bucket.
 * Contains summary statistics for one metric over one time period.
 */
export interface MetricBucket {
  /** Unique bucket ID */
  id: string;
  /** Period type */
  period: AggregationPeriod;
  /** Period start (ISO 8601, rounded to hour/day boundary) */
  periodStart: string;
  /** Period end (ISO 8601) */
  periodEnd: string;
  /** Metric name */
  metric: string;
  /** Event category */
  category: AnalyticsEventCategory;
  /** Tenant scope */
  tenantId: string;
  /** Count of events in this bucket */
  count: number;
  /** Sum of values */
  sum: number;
  /** Average value */
  avg: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** P50 (median) approximation */
  p50: number;
  /** P95 approximation */
  p95: number;
  /** P99 approximation */
  p99: number;
  /** Unit of measurement */
  unit: string;
  /** Aggregation timestamp */
  aggregatedAt: string;
}

/**
 * Dashboard-ready metric series.
 */
export interface MetricSeries {
  metric: string;
  category: string;
  period: AggregationPeriod;
  tenantId: string;
  unit: string;
  dataPoints: Array<{
    periodStart: string;
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  }>;
}

/* ================================================================== */
/* In-memory Aggregation Store                                          */
/* ================================================================== */

const hourlyBuckets: MetricBucket[] = [];
const dailyBuckets: MetricBucket[] = [];
const MAX_BUCKETS = ANALYTICS_AGGREGATION_CONFIG.maxBuckets;

let aggregationSeq = 0;

/** Callback invoked after aggregation with newly created buckets. */
let onBucketsCreatedCb: ((hourly: MetricBucket[], daily: MetricBucket[]) => void) | null = null;

/**
 * Register a callback for newly created buckets (used by ETL writer).
 */
export function setOnBucketsCreated(
  cb: (hourly: MetricBucket[], daily: MetricBucket[]) => void,
): void {
  onBucketsCreatedCb = cb;
}

/**
 * Compute percentile from sorted array.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

/**
 * Round a date to the start of its hour.
 */
function roundToHour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0, 0);
}

/**
 * Round a date to the start of its day.
 */
function roundToDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Run aggregation for a time window.
 * Queries the event buffer and produces hourly/daily buckets.
 */
export function runAggregation(
  since?: string,
  until?: string,
  tenantId?: string,
): { hourly: number; daily: number } {
  const now = new Date();
  const sinceDate = since ? new Date(since) : new Date(now.getTime() - 2 * 3600000); // Last 2 hours
  const untilDate = until ? new Date(until) : now;

  // Query raw events
  const { events } = queryAnalyticsEvents({
    since: sinceDate.toISOString(),
    until: untilDate.toISOString(),
    tenantId,
    limit: 100000,
  });

  if (events.length === 0) return { hourly: 0, daily: 0 };

  // Group by category+metric+tenantId+hour
  const hourlyGroups = new Map<string, typeof events>();
  const dailyGroups = new Map<string, typeof events>();

  for (const event of events) {
    const hourStart = roundToHour(new Date(event.timestamp)).toISOString();
    const dayStart = roundToDay(new Date(event.timestamp)).toISOString();

    const hourKey = `${event.category}::${event.metric}::${event.tenantId}::${hourStart}`;
    const dayKey = `${event.category}::${event.metric}::${event.tenantId}::${dayStart}`;

    if (!hourlyGroups.has(hourKey)) hourlyGroups.set(hourKey, []);
    hourlyGroups.get(hourKey)!.push(event);

    if (!dailyGroups.has(dayKey)) dailyGroups.set(dayKey, []);
    dailyGroups.get(dayKey)!.push(event);
  }

  // Build hourly buckets
  const newHourlyBuckets: MetricBucket[] = [];
  const newDailyBuckets: MetricBucket[] = [];
  let hourlyCount = 0;
  for (const [key, groupEvents] of hourlyGroups) {
    const [category, metric, tid, periodStart] = key.split("::");
    const values = groupEvents.map(e => e.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    aggregationSeq++;
    const bucket: MetricBucket = {
      id: `h-${aggregationSeq}`,
      period: "hourly",
      periodStart,
      periodEnd: new Date(new Date(periodStart).getTime() + 3600000).toISOString(),
      metric,
      category: category as AnalyticsEventCategory,
      tenantId: tid,
      count: values.length,
      sum,
      avg: values.length > 0 ? sum / values.length : 0,
      min: values.length > 0 ? values[0] : 0,
      max: values.length > 0 ? values[values.length - 1] : 0,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
      unit: groupEvents[0].unit,
      aggregatedAt: now.toISOString(),
    };
    hourlyBuckets.push(bucket);
    newHourlyBuckets.push(bucket);
    hourlyCount++;
  }

  // Build daily buckets
  let dailyCount = 0;
  for (const [key, groupEvents] of dailyGroups) {
    const [category, metric, tid, periodStart] = key.split("::");
    const values = groupEvents.map(e => e.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    aggregationSeq++;
    const bucket: MetricBucket = {
      id: `d-${aggregationSeq}`,
      period: "daily",
      periodStart,
      periodEnd: new Date(new Date(periodStart).getTime() + 86400000).toISOString(),
      metric,
      category: category as AnalyticsEventCategory,
      tenantId: tid,
      count: values.length,
      sum,
      avg: values.length > 0 ? sum / values.length : 0,
      min: values.length > 0 ? values[0] : 0,
      max: values.length > 0 ? values[values.length - 1] : 0,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
      unit: groupEvents[0].unit,
      aggregatedAt: now.toISOString(),
    };
    dailyBuckets.push(bucket);
    newDailyBuckets.push(bucket);
    dailyCount++;
  }

  // Notify ETL writer of new buckets
  if (onBucketsCreatedCb && (newHourlyBuckets.length > 0 || newDailyBuckets.length > 0)) {
    try {
      onBucketsCreatedCb(newHourlyBuckets, newDailyBuckets);
    } catch (err) {
      log.warn("Analytics: onBucketsCreated callback failed", { error: String(err) });
    }
  }

  // Evict old buckets
  while (hourlyBuckets.length > MAX_BUCKETS) hourlyBuckets.shift();
  while (dailyBuckets.length > MAX_BUCKETS) dailyBuckets.shift();

  log.info("Analytics aggregation complete", {
    hourlyBuckets: hourlyCount, dailyBuckets: dailyCount,
    totalHourly: hourlyBuckets.length, totalDaily: dailyBuckets.length,
  });

  return { hourly: hourlyCount, daily: dailyCount };
}

/* ================================================================== */
/* Query API                                                            */
/* ================================================================== */

export interface AggregationQuery {
  period?: AggregationPeriod;
  metric?: string;
  category?: string;
  tenantId?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export function queryAggregatedMetrics(q: AggregationQuery): {
  buckets: MetricBucket[];
  total: number;
} {
  const source = q.period === "daily" ? dailyBuckets : hourlyBuckets;
  let filtered = source.slice();

  if (q.tenantId) filtered = filtered.filter(b => b.tenantId === q.tenantId);
  if (q.metric) filtered = filtered.filter(b => b.metric === q.metric);
  if (q.category) filtered = filtered.filter(b => b.category === q.category);
  if (q.since) {
    const sinceMs = new Date(q.since).getTime();
    filtered = filtered.filter(b => new Date(b.periodStart).getTime() >= sinceMs);
  }
  if (q.until) {
    const untilMs = new Date(q.until).getTime();
    filtered = filtered.filter(b => new Date(b.periodStart).getTime() <= untilMs);
  }

  const limit = Math.min(q.limit || 500, 5000);
  return { buckets: filtered.slice(-limit), total: filtered.length };
}

/**
 * Get metric series for dashboard charts.
 */
export function getMetricSeries(
  metric: string,
  opts: {
    period?: AggregationPeriod;
    tenantId?: string;
    since?: string;
    until?: string;
    maxPoints?: number;
  } = {},
): MetricSeries | null {
  const { buckets } = queryAggregatedMetrics({
    metric,
    period: opts.period || "hourly",
    tenantId: opts.tenantId,
    since: opts.since,
    until: opts.until,
    limit: opts.maxPoints || 500,
  });

  if (buckets.length === 0) return null;

  return {
    metric,
    category: buckets[0].category,
    period: opts.period || "hourly",
    tenantId: opts.tenantId || "default",
    unit: buckets[0].unit,
    dataPoints: buckets.map(b => ({
      periodStart: b.periodStart,
      count: b.count,
      avg: Math.round(b.avg * 100) / 100,
      min: b.min,
      max: b.max,
      p95: b.p95,
    })),
  };
}

/**
 * Get aggregation store stats.
 */
export function getAggregationStats(tenantId?: string): {
  hourlyBuckets: number;
  dailyBuckets: number;
  oldestHourly: string | null;
  newestHourly: string | null;
  metrics: string[];
} {
  const scopedHourly = tenantId ? hourlyBuckets.filter((b) => b.tenantId === tenantId) : hourlyBuckets;
  const scopedDaily = tenantId ? dailyBuckets.filter((b) => b.tenantId === tenantId) : dailyBuckets;
  const metricSet = new Set<string>();
  for (const b of scopedHourly) metricSet.add(b.metric);
  for (const b of scopedDaily) metricSet.add(b.metric);

  return {
    hourlyBuckets: scopedHourly.length,
    dailyBuckets: scopedDaily.length,
    oldestHourly: scopedHourly.length > 0 ? scopedHourly[0].periodStart : null,
    newestHourly: scopedHourly.length > 0 ? scopedHourly[scopedHourly.length - 1].periodStart : null,
    metrics: Array.from(metricSet).sort(),
  };
}

/**
 * Export aggregated metrics as CSV.
 */
export function exportAggregatedCsv(q: AggregationQuery): string {
  const { buckets } = queryAggregatedMetrics({ ...q, limit: 100000 });
  const header = "id,period,periodStart,periodEnd,metric,category,tenantId,count,sum,avg,min,max,p50,p95,p99,unit";
  const rows = buckets.map(b =>
    [
      b.id, b.period, b.periodStart, b.periodEnd, b.metric, b.category,
      b.tenantId, b.count, b.sum,
      Math.round(b.avg * 100) / 100,
      b.min, b.max, b.p50, b.p95, b.p99, b.unit,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/* ================================================================== */
/* Periodic Aggregation Job                                             */
/* ================================================================== */

let aggregationTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic aggregation job.
 */
export function startAggregationJob(): void {
  if (aggregationTimer) return;
  const interval = ANALYTICS_AGGREGATION_CONFIG.intervalMs;

  // Run initial aggregation
  try {
    runAggregation();
  } catch (err) {
    log.error("Analytics: initial aggregation failed", { error: String(err) });
  }

  aggregationTimer = setInterval(() => {
    try {
      runAggregation();
    } catch (err) {
      log.error("Analytics: periodic aggregation failed", { error: String(err) });
    }
  }, interval);

  log.info("Analytics aggregation job started", { intervalMs: interval });
}

/**
 * Stop the periodic aggregation job.
 */
export function stopAggregationJob(): void {
  if (aggregationTimer) {
    clearInterval(aggregationTimer);
    aggregationTimer = null;
    log.info("Analytics aggregation job stopped");
  }
}
