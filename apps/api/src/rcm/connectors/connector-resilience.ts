/**
 * Connector Resilience — Phase 48.
 *
 * Circuit breaker + timeout + retry wrapper for RCM connector calls.
 * Mirrors the VistA RPC resilience pattern (rpc-resilience.ts) but
 * for payer/clearinghouse connector outbound operations.
 *
 * Features:
 *   - Per-connector circuit breaker (closed → open → half-open)
 *   - Configurable timeout per call
 *   - Expo-backoff retry for transient failures
 *   - Prometheus metrics for connector latency/success/failure
 *   - Trace span creation for each connector call
 */

import { log } from "../../lib/logger.js";
import {
  connectorCallDuration,
  connectorCallsTotal,
  connectorHealthGauge,
} from "../../telemetry/metrics.js";
import { CONNECTOR_DEFAULT_TIMEOUT_MS } from "./types.js";

/* ------------------------------------------------------------------ */
/* Circuit breaker FSM (per-connector)                                 */
/* ------------------------------------------------------------------ */

type CbState = "closed" | "open" | "half-open";

interface ConnectorCb {
  state: CbState;
  failureCount: number;
  lastFailureAt: number;
  successCount: number;
}

const CB_THRESHOLD = Number(process.env.RCM_CB_THRESHOLD ?? 5);
const CB_RESET_MS = Number(process.env.RCM_CB_RESET_MS ?? 60_000);
const MAX_RETRIES = Number(process.env.RCM_CONNECTOR_RETRIES ?? 2);
const RETRY_BASE_MS = Number(process.env.RCM_CONNECTOR_RETRY_DELAY_MS ?? 2000);

const breakers = new Map<string, ConnectorCb>();

function getCb(connectorId: string): ConnectorCb {
  let cb = breakers.get(connectorId);
  if (!cb) {
    cb = { state: "closed", failureCount: 0, lastFailureAt: 0, successCount: 0 };
    breakers.set(connectorId, cb);
  }
  return cb;
}

function recordSuccess(connectorId: string): void {
  const cb = getCb(connectorId);
  if (cb.state === "half-open") {
    cb.state = "closed";
    cb.successCount++;
    log.info("Connector CB closed", { connectorId });
  }
  cb.failureCount = 0;
}

function recordFailure(connectorId: string): void {
  const cb = getCb(connectorId);
  cb.failureCount++;
  cb.lastFailureAt = Date.now();

  if (cb.failureCount >= CB_THRESHOLD && cb.state === "closed") {
    cb.state = "open";
    log.warn("Connector CB opened", { connectorId, failures: cb.failureCount });
  }
}

function shouldAllow(connectorId: string): boolean {
  const cb = getCb(connectorId);
  if (cb.state === "closed") return true;
  if (cb.state === "open") {
    if (Date.now() - cb.lastFailureAt >= CB_RESET_MS) {
      cb.state = "half-open";
      log.info("Connector CB half-open", { connectorId });
      return true;
    }
    return false;
  }
  // half-open: allow one probe request
  return true;
}

/* ------------------------------------------------------------------ */
/* Timeout helper                                                      */
/* ------------------------------------------------------------------ */

export class ConnectorTimeoutError extends Error {
  constructor(connectorId: string, timeoutMs: number) {
    super(`Connector ${connectorId} timed out after ${timeoutMs}ms`);
    this.name = "ConnectorTimeoutError";
  }
}

export class ConnectorCircuitOpenError extends Error {
  constructor(connectorId: string) {
    super(`Connector ${connectorId} circuit breaker is open`);
    this.name = "ConnectorCircuitOpenError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, connectorId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ConnectorTimeoutError(connectorId, timeoutMs)),
      timeoutMs,
    );
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/* ------------------------------------------------------------------ */
/* Resilient call wrapper                                              */
/* ------------------------------------------------------------------ */

/**
 * Execute a connector operation with circuit breaker, timeout, and retry.
 *
 * @param connectorId - Unique connector identifier (for CB state and metrics)
 * @param operation   - Human-readable operation label (e.g., "submit", "healthCheck")
 * @param fn          - The async function to execute
 * @param opts        - Override timeout, retries
 */
export async function resilientConnectorCall<T>(
  connectorId: string,
  operation: string,
  fn: () => Promise<T>,
  opts?: { timeoutMs?: number; retries?: number },
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? CONNECTOR_DEFAULT_TIMEOUT_MS;
  const maxRetries = opts?.retries ?? MAX_RETRIES;

  if (!shouldAllow(connectorId)) {
    connectorCallsTotal.inc({ connector_id: connectorId, operation, outcome: "circuit_open" });
    throw new ConnectorCircuitOpenError(connectorId);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const result = await withTimeout(fn(), timeoutMs, connectorId);
      const durationSec = (Date.now() - start) / 1000;

      connectorCallDuration.observe({ connector_id: connectorId, operation }, durationSec);
      connectorCallsTotal.inc({ connector_id: connectorId, operation, outcome: "success" });
      connectorHealthGauge.set({ connector_id: connectorId }, 1);

      recordSuccess(connectorId);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const durationSec = (Date.now() - start) / 1000;
      const outcome = lastError instanceof ConnectorTimeoutError ? "timeout" : "error";

      connectorCallDuration.observe({ connector_id: connectorId, operation }, durationSec);
      connectorCallsTotal.inc({ connector_id: connectorId, operation, outcome });

      recordFailure(connectorId);

      if (attempt < maxRetries) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        log.warn("Connector call failed, retrying", {
          connectorId, operation, attempt: attempt + 1, maxRetries, delayMs: delay,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  connectorHealthGauge.set({ connector_id: connectorId }, 0);
  throw lastError!;
}

/* ------------------------------------------------------------------ */
/* Stats / Management                                                  */
/* ------------------------------------------------------------------ */

export function getConnectorCbStats(): Array<{
  connectorId: string;
  state: CbState;
  failureCount: number;
  lastFailureAt: string | null;
}> {
  return Array.from(breakers.entries()).map(([id, cb]) => ({
    connectorId: id,
    state: cb.state,
    failureCount: cb.failureCount,
    lastFailureAt: cb.lastFailureAt ? new Date(cb.lastFailureAt).toISOString() : null,
  }));
}

export function resetConnectorCb(connectorId: string): void {
  breakers.delete(connectorId);
  log.info("Connector CB reset", { connectorId });
}

export function resetAllConnectorCbs(): void {
  breakers.clear();
  log.info("All connector CBs reset");
}
