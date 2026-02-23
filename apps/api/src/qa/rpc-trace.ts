/**
 * RPC Trace Ring Buffer
 *
 * Phase 96B: QA/Audit OS v1.1
 *
 * In-memory ring buffer that captures every RPC call with timing,
 * request context (via AsyncLocalStorage), and PHI-safe metadata.
 *
 * Max 5000 entries, FIFO eviction. No persistence — resets on restart.
 */

import { createHash, randomUUID } from "node:crypto";
import type { RpcTraceEntry, RpcTraceStats } from "./types.js";

/* ── Config ───────────────────────────────────────────────── */

const MAX_BUFFER_SIZE = Number(process.env.RPC_TRACE_BUFFER_SIZE || 5000);
const ENABLED = process.env.RPC_TRACE_ENABLED !== "false"; // on by default

/* ── Ring Buffer ──────────────────────────────────────────── */

const buffer: RpcTraceEntry[] = [];
let writeIndex = 0;
let totalRecorded = 0;

/* ── PHI Sanitization ─────────────────────────────────────── */

/**
 * Hash a DUZ so traces never contain raw user identifiers.
 */
function hashDuz(duz: string): string {
  if (!duz) return "unknown";
  return createHash("sha256").update(`rpc-trace-${duz}`).digest("hex").slice(0, 16);
}

/**
 * Redact RPC parameters that may contain PHI.
 * - Patient DFN → "dfn:***"
 * - SSN patterns → "***-**-****"
 * - Long strings truncated to 50 chars
 */
function sanitizeParams(params: string[]): string[] {
  return params.map((p, i) => {
    if (!p) return "";
    // First param is often DFN — always redact
    if (i === 0 && /^\d+$/.test(p)) return `dfn:${p.slice(0, 1)}***`;
    // SSN pattern
    if (/\d{3}-?\d{2}-?\d{4}/.test(p)) return "***-**-****";
    // Truncate long strings
    if (p.length > 50) return p.slice(0, 50) + "...";
    return p;
  });
}

/* ── Public API ───────────────────────────────────────────── */

export interface RecordRpcOptions {
  rpcName: string;
  params: string[];
  durationMs: number;
  success: boolean;
  error?: string;
  responseLines: number;
  duz?: string;
  requestId?: string;
  traceId?: string;
  httpRoute?: string;
  httpMethod?: string;
}

/**
 * Record an RPC call to the trace buffer.
 */
export function recordRpcTrace(opts: RecordRpcOptions): void {
  if (!ENABLED) return;

  const entry: RpcTraceEntry = {
    id: randomUUID(),
    requestId: opts.requestId || "unknown",
    traceId: opts.traceId,
    rpcName: opts.rpcName,
    params: sanitizeParams(opts.params),
    durationMs: Math.round(opts.durationMs * 100) / 100,
    success: opts.success,
    error: opts.error?.slice(0, 200),
    responseLines: opts.responseLines,
    duzHash: hashDuz(opts.duz || ""),
    timestamp: new Date().toISOString(),
    httpRoute: opts.httpRoute,
    httpMethod: opts.httpMethod,
  };

  if (buffer.length < MAX_BUFFER_SIZE) {
    buffer.push(entry);
  } else {
    buffer[writeIndex] = entry;
  }
  writeIndex = (writeIndex + 1) % MAX_BUFFER_SIZE;
  totalRecorded++;
}

/**
 * Get recent trace entries (newest first).
 */
export function getRecentTraces(limit = 100): RpcTraceEntry[] {
  const sorted = [...buffer].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted.slice(0, Math.min(limit, sorted.length));
}

/**
 * Get traces filtered by RPC name.
 */
export function getTracesByRpc(rpcName: string, limit = 50): RpcTraceEntry[] {
  return buffer
    .filter((e) => e.rpcName === rpcName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get traces filtered by request ID.
 */
export function getTracesByRequestId(requestId: string): RpcTraceEntry[] {
  return buffer
    .filter((e) => e.requestId === requestId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get failing traces.
 */
export function getFailedTraces(limit = 50): RpcTraceEntry[] {
  return buffer
    .filter((e) => !e.success)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Compute aggregate statistics from the buffer.
 */
export function getRpcTraceStats(): RpcTraceStats {
  if (buffer.length === 0) {
    return {
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      topRpcs: [],
      errorRate: 0,
      bufferSize: 0,
      maxBufferSize: MAX_BUFFER_SIZE,
    };
  }

  const successCount = buffer.filter((e) => e.success).length;
  const failureCount = buffer.length - successCount;
  const durations = buffer.map((e) => e.durationMs).sort((a, b) => a - b);
  const avgDurationMs =
    Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 100) / 100;
  const p95Index = Math.floor(durations.length * 0.95);
  const p95DurationMs = durations[p95Index] || 0;

  // Top RPCs by call count
  const rpcCounts = new Map<string, { count: number; totalMs: number }>();
  for (const e of buffer) {
    const cur = rpcCounts.get(e.rpcName) || { count: 0, totalMs: 0 };
    cur.count++;
    cur.totalMs += e.durationMs;
    rpcCounts.set(e.rpcName, cur);
  }
  const topRpcs = [...rpcCounts.entries()]
    .map(([rpcName, { count, totalMs }]) => ({
      rpcName,
      count,
      avgMs: Math.round((totalMs / count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const timestamps = buffer.map((e) => e.timestamp).sort();

  return {
    totalCalls: totalRecorded,
    successCount,
    failureCount,
    avgDurationMs,
    p95DurationMs,
    topRpcs,
    errorRate: buffer.length > 0 ? Math.round((failureCount / buffer.length) * 10000) / 10000 : 0,
    bufferSize: buffer.length,
    maxBufferSize: MAX_BUFFER_SIZE,
    oldestEntry: timestamps[0],
    newestEntry: timestamps[timestamps.length - 1],
  };
}

/**
 * Clear the buffer (for testing).
 */
export function clearRpcTraceBuffer(): void {
  buffer.length = 0;
  writeIndex = 0;
  totalRecorded = 0;
}

/**
 * Whether tracing is enabled.
 */
export function isRpcTraceEnabled(): boolean {
  return ENABLED;
}
