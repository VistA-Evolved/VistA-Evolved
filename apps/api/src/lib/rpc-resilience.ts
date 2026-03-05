/**
 * RPC Resilience Layer — Phase 15B.
 *
 * Provides:
 *   - Timeouts for individual RPC calls
 *   - Retry with exponential backoff (idempotent reads only)
 *   - Circuit breaker (prevents cascading failures)
 *   - Per-patient result caching with configurable TTL
 *   - Metrics collection for observability
 *
 * Wraps the raw rpcBrokerClient calls without modifying the protocol layer.
 */

import { RPC_CONFIG, CACHE_CONFIG } from '../config/server-config.js';
import { log } from './logger.js';

/**
 * Lazy metering callback. Wired at startup to avoid circular import
 * with billing/metering.ts. When null, metering is silently skipped.
 */
let meterRpcCall: ((tenantId: string, event: string) => void) | null = null;

/** Wire the metering callback at startup (called from index.ts or lifecycle.ts). */
export function wireMeteringCallback(fn: (tenantId: string, event: string) => void): void {
  meterRpcCall = fn;
}
import {
  callRpc,
  callRpcWithList,
  withBrokerLock,
  connect,
  type RpcParam,
} from '../vista/rpcBrokerClient.js';
import {
  poolCallRpc,
  poolCallRpcWithList,
  type RpcContext,
} from '../vista/rpcConnectionPool.js';
// Phase 36: OTel tracing + Prometheus metrics
import { startRpcSpan, endRpcSpan } from '../telemetry/tracing.js';
import { rpcCallDuration, rpcCallsTotal, circuitBreakerTrips } from '../telemetry/metrics.js';
// Phase 96B: RPC traces recorded at protocol level in rpcBrokerClient.ts

/* ================================================================== */
/* Circuit Breaker                                                     */
/* ================================================================== */

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: string | null;
  lastStateChange: string;
  totalCalls: number;
  totalFailures: number;
  totalTimeouts: number;
}

let cbState: CircuitState = 'closed';
let cbFailures = 0;
let cbSuccesses = 0;
let cbLastFailure: string | null = null;
let cbLastStateChange: string = new Date().toISOString();
let cbTotalCalls = 0;
let cbTotalFailures = 0;
let cbTotalTimeouts = 0;
let cbOpenedAt = 0;

function transitionCircuit(newState: CircuitState): void {
  if (cbState === newState) return;
  const prev = cbState;
  cbState = newState;
  cbLastStateChange = new Date().toISOString();
  log.warn('Circuit breaker state change', { from: prev, to: newState });
  if (newState === 'open') circuitBreakerTrips.inc();
}

function recordSuccess(): void {
  cbSuccesses++;
  cbTotalCalls++;
  if (cbState === 'half-open') {
    cbFailures = 0;
    transitionCircuit('closed');
  }
}

function recordFailure(reason: string): void {
  cbFailures++;
  cbTotalFailures++;
  cbTotalCalls++;
  cbLastFailure = new Date().toISOString();

  if (cbState === 'half-open') {
    transitionCircuit('open');
    cbOpenedAt = Date.now();
    return;
  }

  if (cbFailures >= RPC_CONFIG.circuitBreakerThreshold) {
    transitionCircuit('open');
    cbOpenedAt = Date.now();
  }
}

function isCircuitOpen(): boolean {
  if (cbState === 'closed') return false;
  if (cbState === 'open') {
    // Check if reset timeout elapsed
    if (Date.now() - cbOpenedAt >= RPC_CONFIG.circuitBreakerResetMs) {
      transitionCircuit('half-open');
      return false; // Allow one probe through
    }
    return true;
  }
  // half-open: allow single request
  return false;
}

/** Get circuit breaker statistics for observability. */
export function getCircuitBreakerStats(): CircuitStats {
  return {
    state: cbState,
    failures: cbFailures,
    successes: cbSuccesses,
    lastFailure: cbLastFailure,
    lastStateChange: cbLastStateChange,
    totalCalls: cbTotalCalls,
    totalFailures: cbTotalFailures,
    totalTimeouts: cbTotalTimeouts,
  };
}

/** Force-reset circuit breaker (admin). */
export function resetCircuitBreaker(): void {
  cbFailures = 0;
  cbSuccesses = 0;
  transitionCircuit('closed');
  log.info('Circuit breaker manually reset');
}

/** Force-open circuit breaker for outage simulation (admin). Phase 503. */
export function forceOpenCircuitBreaker(): void {
  cbFailures = RPC_CONFIG.circuitBreakerThreshold;
  transitionCircuit('open');
  // Set cbOpenedAt 1 hour in the future so isCircuitOpen() computes a
  // negative elapsed time, preventing automatic half-open transition for ~1h.
  cbOpenedAt = Date.now() + 3_600_000;
  log.warn('Circuit breaker force-opened for outage simulation');
}

/* ================================================================== */
/* Timeout wrapper                                                      */
/* ================================================================== */

export class RpcTimeoutError extends Error {
  constructor(rpcName: string, timeoutMs: number) {
    super(`RPC "${rpcName}" timed out after ${timeoutMs}ms`);
    this.name = 'RpcTimeoutError';
  }
}

export class CircuitOpenError extends Error {
  constructor() {
    super('Circuit breaker is open — RPC calls temporarily blocked');
    this.name = 'CircuitOpenError';
  }
}

/**
 * Wrap an async call with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      cbTotalTimeouts++;
      reject(new RpcTimeoutError(label, timeoutMs));
    }, timeoutMs);

    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/* ================================================================== */
/* Retry engine                                                        */
/* ================================================================== */

/**
 * Retry an async function with exponential backoff.
 * Only for idempotent operations (reads).
 */
async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries: number): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = RPC_CONFIG.retryDelayBaseMs * Math.pow(2, attempt);
        log.warn('RPC retry', {
          label,
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: err.message,
        });
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}

/* ================================================================== */
/* Resilient RPC call wrapper                                           */
/* ================================================================== */

/** Metrics per RPC name. */
interface RpcMetrics {
  calls: number;
  successes: number;
  failures: number;
  timeouts: number;
  totalDurationMs: number;
  avgDurationMs: number;
  p95DurationMs: number;
  durations: number[];
}

const metricsMap = new Map<string, RpcMetrics>();

function getOrCreateMetrics(rpcName: string): RpcMetrics {
  let m = metricsMap.get(rpcName);
  if (!m) {
    m = {
      calls: 0,
      successes: 0,
      failures: 0,
      timeouts: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      durations: [],
    };
    metricsMap.set(rpcName, m);
  }
  return m;
}

function updateMetrics(
  rpcName: string,
  durationMs: number,
  success: boolean,
  isTimeout: boolean
): void {
  const m = getOrCreateMetrics(rpcName);
  m.calls++;
  m.totalDurationMs += durationMs;
  m.durations.push(durationMs);
  // Keep only last 1000 measurements for P95
  if (m.durations.length > 1000) m.durations.shift();
  m.avgDurationMs = Math.round(m.totalDurationMs / m.calls);

  // P95
  const sorted = [...m.durations].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  m.p95DurationMs = sorted[p95Index] || 0;

  if (success) m.successes++;
  else m.failures++;
  if (isTimeout) m.timeouts++;
}

/**
 * Execute an RPC call with full resilience:
 *   1. Check circuit breaker
 *   2. Apply timeout
 *   3. Retry on failure (if idempotent)
 *   4. Record metrics
 *   5. Update circuit breaker state
 *
 * @param rpcFn - The actual RPC execution function (e.g., () => callRpc(name, params))
 * @param rpcName - RPC name for metrics/logging
 * @param opts - Options for timeout, retry, caching
 */
export async function resilientRpc<T>(
  rpcFn: () => Promise<T>,
  rpcName: string,
  opts?: {
    timeoutMs?: number;
    idempotent?: boolean;
    maxRetries?: number;
  }
): Promise<T> {
  // 1. Circuit breaker check
  if (isCircuitOpen()) {
    log.error('RPC blocked by circuit breaker', { rpcName, cbState });
    throw new CircuitOpenError();
  }

  const timeoutMs = opts?.timeoutMs ?? RPC_CONFIG.callTimeoutMs;
  const maxRetries = opts?.idempotent !== false ? (opts?.maxRetries ?? RPC_CONFIG.maxRetries) : 0;

  // Phase 36: OTel span for this RPC call
  const span = startRpcSpan(rpcName);
  const start = Date.now();

  try {
    const result = await withRetry(
      () => withTimeout(rpcFn(), timeoutMs, rpcName),
      rpcName,
      maxRetries
    );

    const durationMs = Date.now() - start;
    recordSuccess();
    updateMetrics(rpcName, durationMs, true, false);

    // Phase 36: Prometheus + OTel
    rpcCallDuration.observe({ rpc_name: rpcName, outcome: 'success' }, durationMs / 1000);
    rpcCallsTotal.inc({ rpc_name: rpcName, outcome: 'success' });
    endRpcSpan(span);

    // Phase 586: Billing metering — count RPC calls
    try { meterRpcCall?.('default', 'rpc_call'); } catch { /* best-effort */ }

    log.debug('RPC completed', { rpcName, durationMs });
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const isTimeout = err instanceof RpcTimeoutError;
    recordFailure(err.message);
    updateMetrics(rpcName, durationMs, false, isTimeout);

    // Phase 36: Prometheus + OTel
    const outcome = isTimeout ? 'timeout' : 'error';
    rpcCallDuration.observe({ rpc_name: rpcName, outcome }, durationMs / 1000);
    rpcCallsTotal.inc({ rpc_name: rpcName, outcome });
    endRpcSpan(span, err);

    // Phase 96B: RPC traces now recorded at protocol level in rpcBrokerClient.ts

    log.error('RPC failed', { rpcName, durationMs, isTimeout, error: err.message });
    throw err;
  }
}

/* ================================================================== */
/* Read-RPC cache                                                       */
/* ================================================================== */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const rpcCache = new Map<string, CacheEntry<unknown>>();

/** Build a cache key from RPC name + params. */
function buildCacheKey(rpcName: string, params: unknown[]): string {
  return `${rpcName}::${JSON.stringify(params)}`;
}

/**
 * Execute an RPC with caching. Returns cached result if TTL hasn't expired.
 */
export async function cachedRpc<T>(
  rpcFn: () => Promise<T>,
  rpcName: string,
  params: unknown[],
  ttlMs?: number
): Promise<T> {
  const key = buildCacheKey(rpcName, params);
  const now = Date.now();

  const existing = rpcCache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    log.debug('RPC cache hit', { rpcName, key });
    return existing.value;
  }

  const result = await resilientRpc(rpcFn, rpcName, { idempotent: true });

  rpcCache.set(key, {
    value: result,
    expiresAt: now + (ttlMs ?? CACHE_CONFIG.defaultTtlMs),
  });

  // Evict oldest if over max
  if (rpcCache.size > CACHE_CONFIG.maxEntries) {
    const firstKey = rpcCache.keys().next().value;
    if (firstKey !== undefined) rpcCache.delete(firstKey);
  }

  return result;
}

/** Invalidate cache entries matching a pattern. */
export function invalidateCache(pattern?: string): number {
  if (!pattern) {
    const count = rpcCache.size;
    rpcCache.clear();
    return count;
  }
  let count = 0;
  for (const key of rpcCache.keys()) {
    if (key.includes(pattern)) {
      rpcCache.delete(key);
      count++;
    }
  }
  return count;
}

/* ================================================================== */
/* Metrics export                                                       */
/* ================================================================== */

/** Get all collected RPC metrics. */
export function getRpcMetrics(): Record<string, Omit<RpcMetrics, 'durations'>> {
  const result: Record<string, Omit<RpcMetrics, 'durations'>> = {};
  for (const [name, m] of metricsMap) {
    const { durations: _durations, ...rest } = m;
    result[name] = rest;
  }
  return result;
}

/** Get overall system RPC health summary. */
export function getRpcHealthSummary(): {
  circuitBreaker: CircuitStats;
  cacheSize: number;
  totalRpcsCalled: number;
  totalSuccesses: number;
  totalFailures: number;
  totalTimeouts: number;
  rpcMetrics: Record<string, Omit<RpcMetrics, 'durations'>>;
} {
  let totalCalls = 0,
    totalSuccesses = 0,
    totalFailures = 0,
    totalTimeouts = 0;
  for (const m of metricsMap.values()) {
    totalCalls += m.calls;
    totalSuccesses += m.successes;
    totalFailures += m.failures;
    totalTimeouts += m.timeouts;
  }
  return {
    circuitBreaker: getCircuitBreakerStats(),
    cacheSize: rpcCache.size,
    totalRpcsCalled: totalCalls,
    totalSuccesses,
    totalFailures,
    totalTimeouts,
    rpcMetrics: getRpcMetrics(),
  };
}

/* ================================================================== */
/* Drop-in wrappers: rpc + circuit breaker + timeout + metrics          */
/* ================================================================== */

/**
 * Drop-in replacement for callRpc that adds timeout, circuit breaker,
 * retry (for reads), per-RPC metrics, and mutex-protected socket access.
 *
 * When `ctx` (RpcContext) is provided, routes through the connection pool
 * with DUZ-per-request (Phase 573). Without `ctx`, falls back to the
 * legacy single-socket path using system credentials (backward compatible).
 */
export async function safeCallRpc(
  rpcName: string,
  params: string[],
  opts?: { idempotent?: boolean; timeoutMs?: number; ctx?: RpcContext }
): Promise<string[]> {
  const ctx = opts?.ctx;
  if (ctx) {
    return resilientRpc(
      () => poolCallRpc(rpcName, params, ctx),
      rpcName,
      { idempotent: opts?.idempotent ?? true, timeoutMs: opts?.timeoutMs }
    );
  }
  return resilientRpc(
    () =>
      withBrokerLock(async () => {
        await connect();
        return callRpc(rpcName, params);
      }),
    rpcName,
    { idempotent: opts?.idempotent ?? true, timeoutMs: opts?.timeoutMs }
  );
}

/**
 * Drop-in replacement for callRpcWithList that adds resilience + mutex.
 *
 * When `ctx` (RpcContext) is provided, routes through the connection pool
 * with DUZ-per-request (Phase 573). Without `ctx`, falls back to legacy path.
 */
export async function safeCallRpcWithList(
  rpcName: string,
  params: RpcParam[],
  opts?: { idempotent?: boolean; timeoutMs?: number; ctx?: RpcContext }
): Promise<string[]> {
  const ctx = opts?.ctx;
  if (ctx) {
    return resilientRpc(
      () => poolCallRpcWithList(rpcName, params, ctx),
      rpcName,
      { idempotent: opts?.idempotent ?? true, timeoutMs: opts?.timeoutMs }
    );
  }
  return resilientRpc(
    () =>
      withBrokerLock(async () => {
        await connect();
        return callRpcWithList(rpcName, params);
      }),
    rpcName,
    { idempotent: opts?.idempotent ?? true, timeoutMs: opts?.timeoutMs }
  );
}

export type { RpcContext };
