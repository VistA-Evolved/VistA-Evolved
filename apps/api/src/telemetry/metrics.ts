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
