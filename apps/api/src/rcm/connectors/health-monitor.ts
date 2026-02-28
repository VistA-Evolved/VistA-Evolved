/**
 * RCM — Connector Health Monitor
 *
 * Phase 242 (Wave 6 P5): Background health probe timer that continuously
 * monitors all registered payer connectors and maintains a health timeline.
 *
 * Pattern follows: analytics aggregation timer (Phase 25), room cleanup (Phase 30).
 */

import { log } from "../../lib/logger.js";
import { getAllConnectors } from "./types.js";
import { resilientConnectorCall } from "./connector-resilience.js";
import { CONNECTOR_HEALTH_TIMEOUT_MS } from "./types.js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HealthProbeResult {
  connectorId: string;
  connectorName: string;
  healthy: boolean;
  details?: string;
  probedAt: number;
  durationMs: number;
}

export interface HealthHistory {
  connectorId: string;
  connectorName: string;
  currentStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  uptimePercent: number;
  lastProbe: HealthProbeResult | null;
  recentProbes: HealthProbeResult[];
}

/* ------------------------------------------------------------------ */
/*  In-Memory Store                                                    */
/* ------------------------------------------------------------------ */

const healthTimeline = new Map<string, HealthProbeResult[]>();
const MAX_HISTORY_PER_CONNECTOR = 100;
const PROBE_INTERVAL_MS = Number(process.env.RCM_HEALTH_PROBE_INTERVAL_MS ?? 300_000); // 5 min
let probeTimer: ReturnType<typeof setInterval> | null = null;

/* ------------------------------------------------------------------ */
/*  Background Probe                                                   */
/* ------------------------------------------------------------------ */

/**
 * Start the background health monitor.
 * Probes all connectors at the configured interval.
 */
export function startHealthMonitor(): void {
  if (probeTimer) return; // already running

  // Initial probe after short delay
  setTimeout(() => probeAllConnectors(), 5_000).unref();

  probeTimer = setInterval(() => probeAllConnectors(), PROBE_INTERVAL_MS);
  probeTimer.unref(); // don't keep process alive

  log.info("Connector health monitor started", {
    component: "rcm-health",
    intervalMs: PROBE_INTERVAL_MS,
  });
}

/**
 * Stop the background health monitor.
 */
export function stopHealthMonitor(): void {
  if (probeTimer) {
    clearInterval(probeTimer);
    probeTimer = null;
    log.info("Connector health monitor stopped", { component: "rcm-health" });
  }
}

/**
 * Probe all registered connectors.
 */
export async function probeAllConnectors(): Promise<HealthProbeResult[]> {
  const connectors = getAllConnectors();
  const results: HealthProbeResult[] = [];

  for (const [id, connector] of connectors) {
    const start = Date.now();
    let result: HealthProbeResult;

    try {
      const health = await resilientConnectorCall(
        id,
        "healthCheck",
        () => connector.healthCheck(),
        { timeoutMs: CONNECTOR_HEALTH_TIMEOUT_MS, retries: 0 },
      );

      result = {
        connectorId: id,
        connectorName: connector.name,
        healthy: health.healthy,
        details: health.details,
        probedAt: Date.now(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      result = {
        connectorId: id,
        connectorName: connector.name,
        healthy: false,
        details: (err as Error).message,
        probedAt: Date.now(),
        durationMs: Date.now() - start,
      };
    }

    results.push(result);
    recordProbe(result);
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Timeline Management                                                */
/* ------------------------------------------------------------------ */

function recordProbe(result: HealthProbeResult): void {
  let timeline = healthTimeline.get(result.connectorId);
  if (!timeline) {
    timeline = [];
    healthTimeline.set(result.connectorId, timeline);
  }

  timeline.push(result);
  if (timeline.length > MAX_HISTORY_PER_CONNECTOR) {
    timeline.shift();
  }
}

/**
 * Get health history for all connectors.
 */
export function getHealthHistory(): HealthHistory[] {
  const connectors = getAllConnectors();
  const histories: HealthHistory[] = [];

  for (const [id, connector] of connectors) {
    const timeline = healthTimeline.get(id) || [];
    const lastProbe = timeline.length > 0 ? timeline[timeline.length - 1]! : null;

    const healthyCount = timeline.filter((p) => p.healthy).length;
    const uptimePercent = timeline.length > 0
      ? Math.round((healthyCount / timeline.length) * 100)
      : 0;

    let currentStatus: HealthHistory["currentStatus"] = "unknown";
    if (lastProbe) {
      if (lastProbe.healthy) {
        currentStatus = "healthy";
      } else {
        // Check last 3 probes for degraded vs unhealthy
        const last3 = timeline.slice(-3);
        const healthyLast3 = last3.filter((p) => p.healthy).length;
        currentStatus = healthyLast3 > 0 ? "degraded" : "unhealthy";
      }
    }

    histories.push({
      connectorId: id,
      connectorName: connector.name,
      currentStatus,
      uptimePercent,
      lastProbe,
      recentProbes: timeline.slice(-10),
    });
  }

  return histories;
}

/**
 * Get health history for a specific connector.
 */
export function getConnectorHealthHistory(connectorId: string): HealthHistory | undefined {
  const histories = getHealthHistory();
  return histories.find((h) => h.connectorId === connectorId);
}

/**
 * Check if the monitor is currently running.
 */
export function isHealthMonitorRunning(): boolean {
  return probeTimer !== null;
}
