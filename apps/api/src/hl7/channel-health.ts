/**
 * HL7v2 Channel Health Monitor -- Phase 279 (Wave 9)
 *
 * Aggregates health status across all configured tenant HL7 endpoints.
 * Tracks per-endpoint metrics: up/down, last message time, error rate,
 * message throughput, and connection state.
 *
 * Pattern: In-memory health cache with periodic refresh. No PHI stored.
 */

import { listEndpoints, type Hl7TenantEndpoint } from './tenant-endpoints.js';
import { listRoutes, getRouteStats, getDeadLetterQueue } from './routing/registry.js';
import type { RouteStats } from './routing/types.js';

/* -- Types ----------------------------------------------- */

export type EndpointHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface EndpointHealth {
  endpointId: string;
  endpointName: string;
  tenantId: string;
  direction: string;
  status: EndpointHealthStatus;
  lastMessageAt: number; // epoch ms, 0 = never
  messagesProcessed: number;
  messagesFailed: number;
  errorRate: number; // 0.0 - 1.0
  avgLatencyMs: number;
  activeConnections: number;
  uptimeMs: number;
  checkedAt: string; // ISO 8601
}

export interface ChannelHealthSummary {
  totalEndpoints: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  totalRoutesConfigured: number;
  totalRoutesEnabled: number;
  deadLetterQueueSize: number;
  overallStatus: EndpointHealthStatus;
  endpoints: EndpointHealth[];
  checkedAt: string;
}

/* -- Health State Cache ---------------------------------- */

const endpointMetrics = new Map<
  string,
  {
    messagesProcessed: number;
    messagesFailed: number;
    lastMessageAt: number;
    latencies: number[];
  }
>();

const ERROR_RATE_THRESHOLD_DEGRADED = 0.05; // 5% error rate -> degraded
const ERROR_RATE_THRESHOLD_DOWN = 0.5; // 50% error rate -> down
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min no messages -> unknown

/**
 * Record a message processed by an endpoint.
 * Called by the routing dispatcher after message delivery.
 */
export function recordMessageProcessed(
  endpointId: string,
  success: boolean,
  latencyMs: number
): void {
  let metrics = endpointMetrics.get(endpointId);
  if (!metrics) {
    metrics = { messagesProcessed: 0, messagesFailed: 0, lastMessageAt: 0, latencies: [] };
    endpointMetrics.set(endpointId, metrics);
  }

  metrics.messagesProcessed++;
  if (!success) metrics.messagesFailed++;
  metrics.lastMessageAt = Date.now();

  // Keep sliding window of last 100 latencies
  metrics.latencies.push(latencyMs);
  if (metrics.latencies.length > 100) metrics.latencies.shift();
}

/**
 * Compute health status for a single endpoint.
 */
function computeEndpointHealth(endpoint: Hl7TenantEndpoint): EndpointHealth {
  const now = Date.now();
  const metrics = endpointMetrics.get(endpoint.id);
  const messagesProcessed = metrics?.messagesProcessed ?? 0;
  const messagesFailed = metrics?.messagesFailed ?? 0;
  const lastMessageAt = metrics?.lastMessageAt ?? 0;
  const latencies = metrics?.latencies ?? [];

  const errorRate = messagesProcessed > 0 ? messagesFailed / messagesProcessed : 0;
  const avgLatencyMs =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  let status: EndpointHealthStatus;
  if (endpoint.status === 'inactive' || endpoint.status === 'error') {
    status = 'down';
  } else if (messagesProcessed === 0) {
    status = 'unknown';
  } else if (errorRate >= ERROR_RATE_THRESHOLD_DOWN) {
    status = 'down';
  } else if (errorRate >= ERROR_RATE_THRESHOLD_DEGRADED) {
    status = 'degraded';
  } else if (lastMessageAt > 0 && now - lastMessageAt > STALE_THRESHOLD_MS) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    endpointId: endpoint.id,
    endpointName: endpoint.name,
    tenantId: endpoint.tenantId,
    direction: endpoint.direction,
    status,
    lastMessageAt,
    messagesProcessed,
    messagesFailed,
    errorRate: Math.round(errorRate * 10000) / 10000,
    avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
    activeConnections: 0, // Populated by MLLP server status if available
    uptimeMs: lastMessageAt > 0 ? now - lastMessageAt : 0,
    checkedAt: new Date().toISOString(),
  };
}

/* -- Public API ------------------------------------------ */

/**
 * Get aggregated health summary across all configured HL7 endpoints.
 */
export function getChannelHealthSummary(tenantId?: string): ChannelHealthSummary {
  const allEndpoints = listEndpoints(tenantId);
  const endpoints = allEndpoints.map(computeEndpointHealth);

  const healthy = endpoints.filter((e) => e.status === 'healthy').length;
  const degraded = endpoints.filter((e) => e.status === 'degraded').length;
  const down = endpoints.filter((e) => e.status === 'down').length;
  const unknown = endpoints.filter((e) => e.status === 'unknown').length;

  const allRoutes = listRoutes();
  const enabledRoutes = allRoutes.filter((r) => r.enabled).length;
  const dlqSize = getDeadLetterQueue().length;

  let overallStatus: EndpointHealthStatus;
  if (endpoints.length === 0) {
    overallStatus = 'unknown';
  } else if (down > 0 && healthy === 0) {
    overallStatus = 'down';
  } else if (degraded > 0 || down > 0) {
    overallStatus = 'degraded';
  } else if (healthy > 0) {
    overallStatus = 'healthy';
  } else {
    overallStatus = 'unknown';
  }

  return {
    totalEndpoints: endpoints.length,
    healthy,
    degraded,
    down,
    unknown,
    totalRoutesConfigured: allRoutes.length,
    totalRoutesEnabled: enabledRoutes,
    deadLetterQueueSize: dlqSize,
    overallStatus,
    endpoints,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get health for a single endpoint by ID.
 */
export function getEndpointHealth(endpointId: string): EndpointHealth | null {
  const allEndpoints = listEndpoints();
  const endpoint = allEndpoints.find((e) => e.id === endpointId);
  if (!endpoint) return null;
  return computeEndpointHealth(endpoint);
}

/**
 * Reset metrics for an endpoint (useful after maintenance).
 */
export function resetEndpointMetrics(endpointId: string): boolean {
  return endpointMetrics.delete(endpointId);
}

/**
 * Get channel health for route-level aggregation.
 */
export function getRouteHealthSummary(): Array<{
  routeId: string;
  routeName: string;
  enabled: boolean;
  stats: RouteStats | null;
}> {
  const allRoutes = listRoutes();
  return allRoutes.map((route) => ({
    routeId: route.id,
    routeName: route.name,
    enabled: route.enabled,
    stats: getRouteStats(route.id) ?? null,
  }));
}
