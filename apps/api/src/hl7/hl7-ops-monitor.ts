/**
 * HL7v2 Ops — SLA Monitor + Operational Dashboard
 *
 * Phase 320 (W14-P4): Adds SLA tracking, latency percentiles,
 * time-bucketed throughput, automatic retry, and a unified ops dashboard.
 *
 * Fills gaps in the existing HL7 engine:
 * - SLA thresholds with violation tracking (delivery rate, latency p95)
 * - Latency percentile calculation (p50, p95, p99)
 * - Time-bucketed throughput (messages per minute, per hour)
 * - Automatic retry with configurable backoff
 * - Unified ops dashboard combining health + throughput + SLA + DLQ
 */

/* ------------------------------------------------------------------ */
/*  SLA Configuration                                                  */
/* ------------------------------------------------------------------ */

/** SLA thresholds for an HL7v2 integration channel */
export interface Hl7SlaConfig {
  /** Unique SLA ID */
  id: string;
  /** Target endpoint or channel ID */
  targetId: string;
  /** Tenant ID */
  tenantId: string;
  /** Description */
  description: string;
  /** Minimum delivery success rate (0.0 to 1.0, e.g. 0.995 = 99.5%) */
  deliveryRateTarget: number;
  /** Maximum p95 latency in milliseconds */
  p95LatencyTargetMs: number;
  /** Maximum p99 latency in milliseconds */
  p99LatencyTargetMs: number;
  /** Measurement window in minutes (default: 60) */
  windowMinutes: number;
  /** Whether this SLA is actively being measured */
  enabled: boolean;
  /** Created at */
  createdAt: string;
}

/** SLA violation record */
export interface SlaViolation {
  /** Unique violation ID */
  id: string;
  /** SLA config ID */
  slaId: string;
  /** Which metric was violated */
  metric: "delivery_rate" | "p95_latency" | "p99_latency";
  /** Target value */
  target: number;
  /** Actual observed value */
  actual: number;
  /** Window start timestamp */
  windowStart: string;
  /** Window end timestamp */
  windowEnd: string;
  /** Acknowledged by operator */
  acknowledged: boolean;
  /** Created at */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Latency percentile calculator                                      */
/* ------------------------------------------------------------------ */

/** Calculate percentiles from a sorted array of latencies */
export function calculatePercentiles(latencies: number[]): {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  count: number;
} {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    p50: sorted[Math.floor(n * 0.5)] || 0,
    p95: sorted[Math.floor(n * 0.95)] || 0,
    p99: sorted[Math.floor(n * 0.99)] || 0,
    min: sorted[0] || 0,
    max: sorted[n - 1] || 0,
    avg: Math.round(sorted.reduce((s, v) => s + v, 0) / n),
    count: n,
  };
}

/* ------------------------------------------------------------------ */
/*  Time-bucketed throughput                                           */
/* ------------------------------------------------------------------ */

interface ThroughputBucket {
  /** Minute timestamp (ISO, truncated to minute) */
  minute: string;
  /** Total messages processed */
  processed: number;
  /** Failed messages */
  failed: number;
  /** Latencies recorded in this bucket */
  latencies: number[];
}

/** Max buckets retained (24 hours at 1-minute resolution) */
const MAX_THROUGHPUT_BUCKETS = 1440;

/** Per-endpoint throughput buckets */
const throughputStore = new Map<string, ThroughputBucket[]>();

/** Get the current minute key */
function currentMinuteKey(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

/** Record a message in the throughput tracker */
export function recordThroughput(
  endpointId: string,
  success: boolean,
  latencyMs: number,
): void {
  const key = currentMinuteKey();
  let buckets = throughputStore.get(endpointId);
  if (!buckets) {
    buckets = [];
    throughputStore.set(endpointId, buckets);
  }

  let current = buckets[buckets.length - 1];
  if (!current || current.minute !== key) {
    current = { minute: key, processed: 0, failed: 0, latencies: [] };
    buckets.push(current);
    // Evict old buckets
    while (buckets.length > MAX_THROUGHPUT_BUCKETS) {
      buckets.shift();
    }
  }

  current.processed++;
  if (!success) current.failed++;
  current.latencies.push(latencyMs);
}

/** Get throughput data for an endpoint over the last N minutes */
export function getThroughput(
  endpointId: string,
  lastMinutes: number = 60,
): {
  endpointId: string;
  windowMinutes: number;
  buckets: Array<{
    minute: string;
    processed: number;
    failed: number;
    avgLatencyMs: number;
  }>;
  totals: {
    processed: number;
    failed: number;
    deliveryRate: number;
    latencyPercentiles: ReturnType<typeof calculatePercentiles>;
  };
} {
  const buckets = throughputStore.get(endpointId) || [];
  const cutoff = new Date(Date.now() - lastMinutes * 60_000).toISOString();
  const filtered = buckets.filter((b) => b.minute >= cutoff);

  let totalProcessed = 0;
  let totalFailed = 0;
  const allLatencies: number[] = [];

  const bucketSummaries = filtered.map((b) => {
    totalProcessed += b.processed;
    totalFailed += b.failed;
    allLatencies.push(...b.latencies);
    const avg = b.latencies.length > 0
      ? Math.round(b.latencies.reduce((s, v) => s + v, 0) / b.latencies.length)
      : 0;
    return { minute: b.minute, processed: b.processed, failed: b.failed, avgLatencyMs: avg };
  });

  return {
    endpointId,
    windowMinutes: lastMinutes,
    buckets: bucketSummaries,
    totals: {
      processed: totalProcessed,
      failed: totalFailed,
      deliveryRate: totalProcessed > 0 ? (totalProcessed - totalFailed) / totalProcessed : 1,
      latencyPercentiles: calculatePercentiles(allLatencies),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  SLA Store                                                          */
/* ------------------------------------------------------------------ */

import { randomUUID } from "crypto";

const slaConfigs = new Map<string, Hl7SlaConfig>();
const slaViolations: SlaViolation[] = [];
const MAX_VIOLATIONS = 5000;

/** Create an SLA configuration */
export function createSlaConfig(input: Omit<Hl7SlaConfig, "id" | "createdAt">): Hl7SlaConfig {
  const config: Hl7SlaConfig = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  slaConfigs.set(config.id, config);
  return config;
}

/** List SLA configs */
export function listSlaConfigs(tenantId?: string): Hl7SlaConfig[] {
  const all = Array.from(slaConfigs.values());
  return tenantId ? all.filter((c) => c.tenantId === tenantId) : all;
}

/** Get SLA config by ID */
export function getSlaConfig(id: string): Hl7SlaConfig | undefined {
  return slaConfigs.get(id);
}

/** Delete SLA config */
export function deleteSlaConfig(id: string): boolean {
  return slaConfigs.delete(id);
}

/** Evaluate all SLAs against current throughput data and record violations */
export function evaluateSlas(): SlaViolation[] {
  const newViolations: SlaViolation[] = [];
  const now = new Date();

  for (const sla of slaConfigs.values()) {
    if (!sla.enabled) continue;

    const throughput = getThroughput(sla.targetId, sla.windowMinutes);
    const { deliveryRate, latencyPercentiles } = throughput.totals;

    // Check delivery rate
    if (deliveryRate < sla.deliveryRateTarget && throughput.totals.processed > 0) {
      const v = createViolation(sla.id, "delivery_rate", sla.deliveryRateTarget, deliveryRate, now, sla.windowMinutes);
      newViolations.push(v);
    }

    // Check p95 latency
    if (latencyPercentiles.p95 > sla.p95LatencyTargetMs && latencyPercentiles.count > 0) {
      const v = createViolation(sla.id, "p95_latency", sla.p95LatencyTargetMs, latencyPercentiles.p95, now, sla.windowMinutes);
      newViolations.push(v);
    }

    // Check p99 latency
    if (latencyPercentiles.p99 > sla.p99LatencyTargetMs && latencyPercentiles.count > 0) {
      const v = createViolation(sla.id, "p99_latency", sla.p99LatencyTargetMs, latencyPercentiles.p99, now, sla.windowMinutes);
      newViolations.push(v);
    }
  }

  return newViolations;
}

function createViolation(
  slaId: string,
  metric: SlaViolation["metric"],
  target: number,
  actual: number,
  windowEnd: Date,
  windowMinutes: number,
): SlaViolation {
  const v: SlaViolation = {
    id: randomUUID(),
    slaId,
    metric,
    target,
    actual: Math.round(actual * 10000) / 10000,
    windowStart: new Date(windowEnd.getTime() - windowMinutes * 60_000).toISOString(),
    windowEnd: windowEnd.toISOString(),
    acknowledged: false,
    createdAt: new Date().toISOString(),
  };
  slaViolations.push(v);
  while (slaViolations.length > MAX_VIOLATIONS) {
    slaViolations.shift();
  }
  return v;
}

/** List SLA violations */
export function listSlaViolations(filters?: {
  slaId?: string;
  acknowledged?: boolean;
  limit?: number;
}): SlaViolation[] {
  let result = [...slaViolations];
  if (filters?.slaId) result = result.filter((v) => v.slaId === filters.slaId);
  if (filters?.acknowledged !== undefined) result = result.filter((v) => v.acknowledged === filters.acknowledged);
  result.reverse(); // newest first
  return result.slice(0, filters?.limit || 100);
}

/** Acknowledge a violation */
export function acknowledgeSlaViolation(id: string): boolean {
  const v = slaViolations.find((v) => v.id === id);
  if (!v) return false;
  v.acknowledged = true;
  return true;
}

/* ------------------------------------------------------------------ */
/*  Retry Queue                                                        */
/* ------------------------------------------------------------------ */

/** Retry policy configuration */
export interface RetryPolicy {
  /** Max retry attempts */
  maxRetries: number;
  /** Initial backoff in ms */
  initialBackoffMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Max backoff in ms */
  maxBackoffMs: number;
}

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialBackoffMs: 5_000,
  backoffMultiplier: 2,
  maxBackoffMs: 60_000,
};

/** A message queued for automatic retry */
export interface RetryEntry {
  /** DLQ entry ID */
  dlqEntryId: string;
  /** Retry attempt number */
  attempt: number;
  /** Next retry timestamp */
  nextRetryAt: string;
  /** Policy used */
  policy: RetryPolicy;
  /** Status */
  status: "pending" | "retrying" | "succeeded" | "exhausted";
  /** Last retry timestamp */
  lastRetryAt?: string;
  /** Last error */
  lastError?: string;
}

const retryQueue = new Map<string, RetryEntry>();

/** Queue a DLQ entry for automatic retry */
export function queueForRetry(
  dlqEntryId: string,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): RetryEntry {
  const entry: RetryEntry = {
    dlqEntryId,
    attempt: 0,
    nextRetryAt: new Date(Date.now() + policy.initialBackoffMs).toISOString(),
    policy,
    status: "pending",
  };
  retryQueue.set(dlqEntryId, entry);
  return entry;
}

/** Get retry state for a DLQ entry */
export function getRetryState(dlqEntryId: string): RetryEntry | undefined {
  return retryQueue.get(dlqEntryId);
}

/** List all retry queue entries */
export function listRetryQueue(): RetryEntry[] {
  return Array.from(retryQueue.values()).sort(
    (a, b) => a.nextRetryAt.localeCompare(b.nextRetryAt),
  );
}

/** Process retry queue: returns entries due for retry */
export function getRetryDueEntries(): RetryEntry[] {
  const now = new Date().toISOString();
  return Array.from(retryQueue.values()).filter(
    (e) => e.status === "pending" && e.nextRetryAt <= now,
  );
}

/** Record a retry attempt result */
export function recordRetryResult(
  dlqEntryId: string,
  success: boolean,
  error?: string,
): void {
  const entry = retryQueue.get(dlqEntryId);
  if (!entry) return;

  entry.attempt++;
  entry.lastRetryAt = new Date().toISOString();

  if (success) {
    entry.status = "succeeded";
  } else if (entry.attempt >= entry.policy.maxRetries) {
    entry.status = "exhausted";
    entry.lastError = error;
  } else {
    const backoff = Math.min(
      entry.policy.initialBackoffMs * Math.pow(entry.policy.backoffMultiplier, entry.attempt),
      entry.policy.maxBackoffMs,
    );
    entry.nextRetryAt = new Date(Date.now() + backoff).toISOString();
    entry.lastError = error;
    entry.status = "pending";
  }
}

/** Get retry queue stats */
export function getRetryQueueStats(): {
  total: number;
  pending: number;
  retrying: number;
  succeeded: number;
  exhausted: number;
} {
  let pending = 0, retrying = 0, succeeded = 0, exhausted = 0;
  for (const e of retryQueue.values()) {
    switch (e.status) {
      case "pending": pending++; break;
      case "retrying": retrying++; break;
      case "succeeded": succeeded++; break;
      case "exhausted": exhausted++; break;
    }
  }
  return { total: retryQueue.size, pending, retrying, succeeded, exhausted };
}

/* ------------------------------------------------------------------ */
/*  Unified Ops Dashboard                                              */
/* ------------------------------------------------------------------ */

import { getChannelHealthSummary } from "./channel-health.js";
import { getDlqStats } from "./dead-letter-enhanced.js";
import { getMessageEventStats } from "./message-event-store.js";

/** Build a unified ops dashboard response */
export function buildOpsDashboard(tenantId?: string): {
  channelHealth: ReturnType<typeof getChannelHealthSummary>;
  messageEvents: ReturnType<typeof getMessageEventStats>;
  dlq: ReturnType<typeof getDlqStats>;
  retryQueue: ReturnType<typeof getRetryQueueStats>;
  slaConfigs: Hl7SlaConfig[];
  activeSlaViolations: SlaViolation[];
  throughputEndpoints: string[];
} {
  const slaList = listSlaConfigs(tenantId);
  const violations = listSlaViolations({ acknowledged: false, limit: 50 });

  return {
    channelHealth: getChannelHealthSummary(tenantId),
    messageEvents: getMessageEventStats(),
    dlq: getDlqStats(),
    retryQueue: getRetryQueueStats(),
    slaConfigs: slaList,
    activeSlaViolations: violations,
    throughputEndpoints: Array.from(throughputStore.keys()),
  };
}

/** Get store stats for store-policy */
export function getOpsStoreStats(): {
  throughputBuckets: number;
  slaConfigs: number;
  slaViolations: number;
  retryQueueSize: number;
} {
  let totalBuckets = 0;
  for (const buckets of throughputStore.values()) {
    totalBuckets += buckets.length;
  }
  return {
    throughputBuckets: totalBuckets,
    slaConfigs: slaConfigs.size,
    slaViolations: slaViolations.length,
    retryQueueSize: retryQueue.size,
  };
}
