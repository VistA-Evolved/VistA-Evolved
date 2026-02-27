/**
 * profiler.ts -- Route-level performance profiling (Phase 162)
 *
 * Collects timing data per route, calculates percentiles, tracks slow queries.
 * In-memory ring buffers reset on API restart.
 */

import { randomUUID } from "node:crypto";
import type { RouteProfile, RouteTiming, SlowQueryEntry } from "./types.js";
import { checkBudget, listBudgets } from "./budget-engine.js";

/* ------------------------------------------------------------------ */
/*  In-memory stores                                                   */
/* ------------------------------------------------------------------ */

/**
 * Raw timing ring buffer per route (max 1000 samples per route).
 */
const timingBuffers = new Map<string, RouteTiming[]>();
const MAX_SAMPLES_PER_ROUTE = 1000;

/** Slow query log (ring buffer, max 2000 entries) */
const slowQueryLog: SlowQueryEntry[] = [];
const MAX_SLOW_QUERIES = 2000;

/** Default slow threshold if no budget exists */
const DEFAULT_SLOW_THRESHOLD_MS = 3000;

/* ------------------------------------------------------------------ */
/*  Record a route timing                                              */
/* ------------------------------------------------------------------ */

function routeKey(method: string, pattern: string): string {
  return `${method}|${pattern}`;
}

export function recordRouteProfile(timing: RouteTiming): void {
  const key = routeKey(timing.method, timing.routePattern);

  // Add to ring buffer
  let buf = timingBuffers.get(key);
  if (!buf) {
    buf = [];
    timingBuffers.set(key, buf);
  }
  if (buf.length >= MAX_SAMPLES_PER_ROUTE) {
    buf.shift();
  }
  buf.push(timing);

  // Check budget
  const budgetResult = checkBudget(timing.routePattern, timing.method, timing.durationMs, timing.responseBytes);
  if (budgetResult === "exceeded") {
    const budgets = listBudgets();
    const matched = budgets.find(
      (b) => timing.routePattern.startsWith(b.routePattern) && (b.method === "*" || b.method === timing.method)
    );
    const entry: SlowQueryEntry = {
      id: randomUUID(),
      routePattern: timing.routePattern,
      method: timing.method,
      durationMs: timing.durationMs,
      responseBytes: timing.responseBytes,
      statusCode: timing.statusCode,
      timestamp: timing.timestamp,
      budgetId: matched?.id,
      overByMs: matched ? timing.durationMs - matched.maxMs : undefined,
    };
    if (slowQueryLog.length >= MAX_SLOW_QUERIES) slowQueryLog.shift();
    slowQueryLog.push(entry);
  } else if (timing.durationMs > DEFAULT_SLOW_THRESHOLD_MS) {
    // No budget matched but still slow
    const entry: SlowQueryEntry = {
      id: randomUUID(),
      routePattern: timing.routePattern,
      method: timing.method,
      durationMs: timing.durationMs,
      responseBytes: timing.responseBytes,
      statusCode: timing.statusCode,
      timestamp: timing.timestamp,
    };
    if (slowQueryLog.length >= MAX_SLOW_QUERIES) slowQueryLog.shift();
    slowQueryLog.push(entry);
  }
}

/* ------------------------------------------------------------------ */
/*  Calculate percentiles                                              */
/* ------------------------------------------------------------------ */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/* ------------------------------------------------------------------ */
/*  Query profiles                                                     */
/* ------------------------------------------------------------------ */

export function getRouteProfiles(): RouteProfile[] {
  const profiles: RouteProfile[] = [];

  for (const [key, timings] of timingBuffers) {
    const [method, routePattern] = key.split("|", 2);
    if (timings.length === 0) continue;

    const durations = timings.map((t) => t.durationMs).sort((a, b) => a - b);
    const bytes = timings.map((t) => t.responseBytes);
    const errors = timings.filter((t) => t.statusCode >= 400).length;

    const avgMs = durations.reduce((s, d) => s + d, 0) / durations.length;
    const avgBytes = bytes.reduce((s, b) => s + b, 0) / bytes.length;

    // Budget status
    const budgetResult = checkBudget(routePattern, method, percentile(durations, 95), Math.max(...bytes));

    profiles.push({
      routePattern,
      method,
      requestCount: timings.length,
      avgMs: Math.round(avgMs * 100) / 100,
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      maxMs: Math.max(...durations),
      minMs: Math.min(...durations),
      avgBytes: Math.round(avgBytes),
      maxBytes: Math.max(...bytes),
      errorCount: errors,
      budgetStatus: budgetResult,
      updatedAt: timings[timings.length - 1].timestamp,
    });
  }

  return profiles.sort((a, b) => b.p95Ms - a.p95Ms);
}

export function getSlowRoutes(thresholdMs?: number, limit = 50): RouteProfile[] {
  const profiles = getRouteProfiles();
  if (thresholdMs != null) {
    return profiles.filter((p) => p.p95Ms >= thresholdMs).slice(0, limit);
  }
  return profiles.slice(0, limit);
}

export function getSlowQueryLog(limit = 50): SlowQueryEntry[] {
  return slowQueryLog.slice(-limit).reverse();
}

export function getProfiledRouteCount(): number {
  return timingBuffers.size;
}

export function getTotalRequestCount(): number {
  let total = 0;
  for (const buf of timingBuffers.values()) total += buf.length;
  return total;
}

export function getSystemP95(): number {
  const allDurations: number[] = [];
  for (const buf of timingBuffers.values()) {
    for (const t of buf) allDurations.push(t.durationMs);
  }
  allDurations.sort((a, b) => a - b);
  return percentile(allDurations, 95);
}

export function getSystemAvg(): number {
  let total = 0;
  let count = 0;
  for (const buf of timingBuffers.values()) {
    for (const t of buf) { total += t.durationMs; count++; }
  }
  return count > 0 ? Math.round((total / count) * 100) / 100 : 0;
}

/** Reset all profiling data */
export function resetProfiles(): void {
  timingBuffers.clear();
  slowQueryLog.length = 0;
}
