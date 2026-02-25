/**
 * Prometheus metrics registry -- Phase 36
 *
 * Exposes prom-client metrics for Prometheus scraping at /metrics/prometheus.
 * All metrics are PHI-safe: labels contain RPC names, status codes, methods --
 * never patient data, credentials, or clinical content.
 */

import client from "prom-client";

/* ------------------------------------------------------------------ */
/* Registry + defaults                                                 */
/* ------------------------------------------------------------------ */

export const registry = new client.Registry();

// Collect default Node.js process metrics (heap, CPU, event loop, GC)
client.collectDefaultMetrics({ register: registry });

/* ------------------------------------------------------------------ */
/* HTTP request metrics                                                */
/* ------------------------------------------------------------------ */

/** HTTP request duration histogram (seconds) */
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/** HTTP requests total counter */
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

/** HTTP active requests gauge */
export const httpActiveRequests = new client.Gauge({
  name: "http_active_requests",
  help: "Number of in-flight HTTP requests",
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* RPC metrics                                                         */
/* ------------------------------------------------------------------ */

/** RPC call duration histogram (seconds) */
export const rpcCallDuration = new client.Histogram({
  name: "vista_rpc_call_duration_seconds",
  help: "Duration of VistA RPC calls in seconds",
  labelNames: ["rpc_name", "outcome"] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15],
  registers: [registry],
});

/** RPC calls total counter */
export const rpcCallsTotal = new client.Counter({
  name: "vista_rpc_calls_total",
  help: "Total VistA RPC calls",
  labelNames: ["rpc_name", "outcome"] as const,
  registers: [registry],
});

/** Circuit breaker state gauge (0=closed, 1=open, 2=half-open) */
export const circuitBreakerState = new client.Gauge({
  name: "vista_circuit_breaker_state",
  help: "Circuit breaker state: 0=closed, 1=open, 2=half-open",
  registers: [registry],
});

/** Circuit breaker trip counter */
export const circuitBreakerTrips = new client.Counter({
  name: "vista_circuit_breaker_trips_total",
  help: "Total times circuit breaker tripped to open",
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* Error metrics                                                       */
/* ------------------------------------------------------------------ */

/** Error counter by category */
export const errorsTotal = new client.Counter({
  name: "vista_errors_total",
  help: "Total errors by category",
  labelNames: ["category"] as const,
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* Application-specific gauges                                          */
/* ------------------------------------------------------------------ */

/** Active sessions gauge */
export const activeSessions = new client.Gauge({
  name: "vista_active_sessions",
  help: "Number of active user sessions",
  registers: [registry],
});

/** RPC cache size gauge */
export const rpcCacheSize = new client.Gauge({
  name: "vista_rpc_cache_size",
  help: "Number of entries in RPC response cache",
  registers: [registry],
});

/** Immutable audit chain length gauge */
export const auditChainLength = new client.Gauge({
  name: "vista_immutable_audit_chain_length",
  help: "Number of entries in immutable audit chain",
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* RCM / Connector metrics — Phase 48                                  */
/* ------------------------------------------------------------------ */

/** Total RCM claims by current lifecycle status */
export const rcmClaimsTotal = new client.Gauge({
  name: "rcm_claims_total",
  help: "Total RCM claims by lifecycle status",
  labelNames: ["status"] as const,
  registers: [registry],
});

/** EDI pipeline depth by stage */
export const rcmPipelineDepth = new client.Gauge({
  name: "rcm_pipeline_depth",
  help: "Number of claims in each EDI pipeline stage",
  labelNames: ["stage"] as const,
  registers: [registry],
});

/** Connector call duration (seconds) */
export const connectorCallDuration = new client.Histogram({
  name: "rcm_connector_call_duration_seconds",
  help: "Duration of RCM connector calls in seconds",
  labelNames: ["connector_id", "operation"] as const,
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [registry],
});

/** Connector calls total */
export const connectorCallsTotal = new client.Counter({
  name: "rcm_connector_calls_total",
  help: "Total RCM connector calls",
  labelNames: ["connector_id", "operation", "outcome"] as const,
  registers: [registry],
});

/** Connector health (1=up, 0=down) */
export const connectorHealthGauge = new client.Gauge({
  name: "rcm_connector_health",
  help: "RCM connector health status: 1=up, 0=down",
  labelNames: ["connector_id"] as const,
  registers: [registry],
});

/** Unified audit entry count across all stores */
export const unifiedAuditEntries = new client.Gauge({
  name: "unified_audit_entries_total",
  help: "Total audit entries across all audit stores",
  labelNames: ["source"] as const,
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* Database pool metrics — Phase 133                                    */
/* ------------------------------------------------------------------ */

/** DB pool connections currently in use (totalCount - idleCount) */
export const dbPoolInUse = new client.Gauge({
  name: "db_pool_in_use",
  help: "Number of database pool connections currently in use",
  registers: [registry],
});

/** DB pool total connections */
export const dbPoolTotal = new client.Gauge({
  name: "db_pool_total",
  help: "Total number of database pool connections",
  registers: [registry],
});

/** DB pool waiting clients */
export const dbPoolWaiting = new client.Gauge({
  name: "db_pool_waiting",
  help: "Number of clients waiting for a database pool connection",
  registers: [registry],
});

/** DB query duration histogram (seconds) */
export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* Audit metrics — Phase 133                                            */
/* ------------------------------------------------------------------ */

/** Total audit events recorded (counter, not gauge) */
export const auditEventsTotal = new client.Counter({
  name: "audit_events_total",
  help: "Total audit events recorded",
  labelNames: ["action_prefix"] as const,
  registers: [registry],
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Sanitize route for metric labels.
 * Replaces dynamic path segments (UUIDs, DFNs, IDs) with placeholders.
 * Prevents metric cardinality explosion from patient-specific URLs.
 */
export function sanitizeRoute(url: string): string {
  return url
    // Strip query string
    .replace(/\?.*$/, "")
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    // Replace numeric path segments (DFN, IEN, etc.)
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    // Collapse consecutive slashes
    .replace(/\/+/g, "/");
}

/* ------------------------------------------------------------------ */
/* SLO tracking — Phase 77                                             */
/* ------------------------------------------------------------------ */

/**
 * SLO latency gauge — tracks percentage of requests within p95 budget per category.
 * Value 1.0 = 100% within budget, 0.0 = 0% within budget.
 */
export const sloLatencyWithinBudget = new client.Gauge({
  name: "slo_latency_within_budget",
  help: "Percentage of requests within p95 latency budget (0.0-1.0)",
  labelNames: ["category"] as const,
  registers: [registry],
});

/**
 * SLO error budget remaining gauge — tracks remaining error budget.
 * Value 1.0 = full budget remaining, 0.0 = budget exhausted.
 */
export const sloErrorBudgetRemaining = new client.Gauge({
  name: "slo_error_budget_remaining",
  help: "Remaining error budget (0.0-1.0, based on SLO_ERROR_BUDGET)",
  labelNames: ["category"] as const,
  registers: [registry],
});

/** Rolling window for SLO computation */
interface SloSample { durationMs: number; isError: boolean; timestamp: number }
const sloWindows: Map<string, SloSample[]> = new Map();
const SLO_WINDOW_MS = parseInt(process.env.SLO_WINDOW_MS ?? "3600000", 10);
const SLO_ERROR_BUDGET = parseFloat(process.env.SLO_ERROR_BUDGET ?? "0.001");

/**
 * Record an SLO sample for a route category.
 * Call this from the onResponse hook for every API request.
 */
export function recordSloSample(category: string, durationMs: number, isError: boolean, p95Budget?: number): void {
  const now = Date.now();
  if (!sloWindows.has(category)) sloWindows.set(category, []);
  const window = sloWindows.get(category)!;
  window.push({ durationMs, isError, timestamp: now });

  // Prune old samples outside the window
  const cutoff = now - SLO_WINDOW_MS;
  while (window.length > 0 && window[0].timestamp < cutoff) window.shift();

  // Compute and update gauges
  if (window.length > 0) {
    // Latency SLO: % within p95 budget
    if (p95Budget && p95Budget > 0) {
      const withinBudget = window.filter((s) => s.durationMs <= p95Budget).length;
      sloLatencyWithinBudget.labels(category).set(withinBudget / window.length);
    }

    // Error SLO: remaining error budget
    const errorCount = window.filter((s) => s.isError).length;
    const errorRate = errorCount / window.length;
    const remaining = Math.max(0, 1 - errorRate / SLO_ERROR_BUDGET);
    sloErrorBudgetRemaining.labels(category).set(remaining);
  }
}

/**
 * Get Prometheus metrics as text/plain string.
 */
export async function getPrometheusMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get metrics content type header.
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}
