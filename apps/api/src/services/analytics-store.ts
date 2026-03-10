/**
 * Analytics Event Store -- Phase 25.
 *
 * Append-only, tenant-scoped event stream for platform ops and usage metrics.
 * PHI-safe by design: no patient DFN, user IDs are salted-hashed.
 *
 * Data classes captured (per docs/analytics/phase25-data-classification.md):
 *   - Operational: API latency, RPC failures, queue depth, login/logout
 *   - De-identified usage: panel views, order drafts, imaging views (hashed user)
 *
 * NEVER stored here:
 *   - Patient DFN, name, SSN, DOB
 *   - Clinical note text, medication details
 *   - DICOM pixel data or patient-linked study UIDs
 *   - VistA credentials
 */

import { createHash, randomUUID } from "crypto";
import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { dirname } from "path";
import { log } from "../lib/logger.js";
import { ANALYTICS_EVENT_CONFIG } from "../config/analytics-config.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

/**
 * Analytics event categories -- maps to data classification doc.
 */
export type AnalyticsEventCategory =
  | "ops.api"           // API request/response metrics
  | "ops.rpc"           // RPC call metrics
  | "ops.circuit"       // Circuit breaker state changes
  | "ops.cache"         // Cache hit/miss stats
  | "ops.auth"          // Login/logout/session events
  | "ops.error"         // Error counts by type
  | "ops.queue"         // Queue depth snapshots
  | "usage.panel"       // UI panel/tab view counts
  | "usage.order"       // Order draft/submit counts
  | "usage.imaging"     // Imaging view/search counts
  | "usage.report"      // Report generation counts
  | "usage.search"      // Patient search counts
  | "usage.note"        // Note creation counts
  | "perf.latency"      // Endpoint latency measurements
  | "perf.rpc_duration" // RPC call duration
  | "system.startup"    // System lifecycle
  | "system.shutdown";

/**
 * A single analytics event. PHI-safe by schema design.
 */
export interface AnalyticsEvent {
  /** Unique event ID */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Event category */
  category: AnalyticsEventCategory;
  /** Metric name within category */
  metric: string;
  /** Numeric value (count, duration_ms, bytes, etc.) */
  value: number;
  /** Unit of measurement */
  unit: "count" | "ms" | "bytes" | "percent" | "ratio";
  /** Tenant scope */
  tenantId: string;
  /** Facility scope (optional) */
  facilityId?: string;
  /** Salted hash of actor DUZ (NEVER raw DUZ in analytics) */
  actorHash?: string;
  /** Endpoint or RPC name (no PHI in URL paths) */
  target?: string;
  /** HTTP method or RPC verb */
  method?: string;
  /** Status code or outcome */
  statusCode?: number;
  /** Additional tags (key-value, no PHI) */
  tags?: Record<string, string | number | boolean>;
}

/* ================================================================== */
/* PHI Safety                                                           */
/* ================================================================== */

const USER_SALT = ANALYTICS_EVENT_CONFIG.userIdSalt;

/**
 * Hash a user DUZ for analytics storage.
 * Uses salted SHA-256 -- not reversible without the salt.
 */
export function hashUserId(duz: string): string {
  return createHash("sha256").update(`${USER_SALT}:${duz}`).digest("hex").slice(0, 16);
}

/**
 * Strip PHI from analytics event tags.
 * Blocks any keys that could contain patient identifiers.
 */
function sanitizeAnalyticsTags(tags?: Record<string, string | number | boolean>): Record<string, string | number | boolean> | undefined {
  if (!tags) return undefined;
  const BLOCKED = new Set([
    "dfn", "patientdfn", "patient_dfn", "patientname", "patient_name",
    "ssn", "dob", "dateofbirth", "accesscode", "verifycode",
    "password", "token", "secret", "notetext", "medicationname",
  ]);
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(tags)) {
    if (BLOCKED.has(key.toLowerCase())) continue;
    // Truncate long string values
    if (typeof value === "string" && value.length > 100) {
      clean[key] = value.slice(0, 100);
    } else {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

/* ================================================================== */
/* In-memory ring buffer store                                          */
/* ================================================================== */

const eventBuffer: AnalyticsEvent[] = [];
const MAX_EVENTS = ANALYTICS_EVENT_CONFIG.maxMemoryEvents;

/**
 * Restore events from JSONL file on startup.
 * Loads the last MAX_EVENTS lines into the ring buffer.
 */
function restoreEventsFromFile(): void {
  const file = ANALYTICS_EVENT_CONFIG.eventFilePath;
  if (!file || !existsSync(file)) return;
  try {
    const content = readFileSync(file, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    const recent = lines.slice(-MAX_EVENTS);
    let restored = 0;
    for (const line of recent) {
      try {
        const event = JSON.parse(line) as AnalyticsEvent;
        if (event.id && event.timestamp && event.category) {
          eventBuffer.push(event);
          restored++;
        }
      } catch { /* skip malformed lines */ }
    }
    if (restored > 0) {
      log.info("Analytics: Restored events from file", { count: restored, file });
    }
  } catch (err) {
    log.warn("Analytics: Failed to restore events from file", { error: String(err) });
  }
}

/**
 * Initialize the analytics store.
 * Restores persisted events from JSONL file.
 */
export function initAnalyticsStore(): void {
  restoreEventsFromFile();
}

/**
 * Record an analytics event.
 * This is the primary API for capturing metrics.
 */
export function recordAnalyticsEvent(
  category: AnalyticsEventCategory,
  metric: string,
  value: number,
  opts: {
    unit?: AnalyticsEvent["unit"];
    tenantId?: string;
    facilityId?: string;
    actorDuz?: string;
    target?: string;
    method?: string;
    statusCode?: number;
    tags?: Record<string, string | number | boolean>;
  } = {},
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    category,
    metric,
    value,
    unit: opts.unit || "count",
    tenantId: opts.tenantId || "default",
    facilityId: opts.facilityId,
    actorHash: opts.actorDuz ? hashUserId(opts.actorDuz) : undefined,
    target: opts.target,
    method: opts.method,
    statusCode: opts.statusCode,
    tags: sanitizeAnalyticsTags(opts.tags),
  };

  eventBuffer.push(event);

  // Ring buffer eviction
  if (eventBuffer.length > MAX_EVENTS) {
    const excess = eventBuffer.length - MAX_EVENTS;
    eventBuffer.splice(0, excess);
  }

  // Add to JSONL persistence queue
  if (EVENT_FILE) pendingFlush.push(event);

  return event;
}

/* ================================================================== */
/* JSONL Persistence (optional)                                         */
/* ================================================================== */

let pendingFlush: AnalyticsEvent[] = [];
const FLUSH_INTERVAL = ANALYTICS_EVENT_CONFIG.flushIntervalMs;
const EVENT_FILE = ANALYTICS_EVENT_CONFIG.eventFilePath;

function flushToFile(): void {
  if (!EVENT_FILE || pendingFlush.length === 0) return;
  try {
    const dir = dirname(EVENT_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const lines = pendingFlush.map(e => JSON.stringify(e)).join("\n") + "\n";
    appendFileSync(EVENT_FILE, lines, "utf-8");
    pendingFlush = [];
  } catch (err) {
    log.error("Analytics: failed to flush events to file", { error: String(err) });
  }
}

// Periodic flush
if (EVENT_FILE) {
  setInterval(flushToFile, FLUSH_INTERVAL).unref();
}

/* ================================================================== */
/* Query API                                                            */
/* ================================================================== */

export interface AnalyticsEventQuery {
  category?: AnalyticsEventCategory;
  metric?: string;
  tenantId?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export function queryAnalyticsEvents(q: AnalyticsEventQuery): {
  events: AnalyticsEvent[];
  total: number;
} {
  let filtered = eventBuffer.slice();

  if (q.tenantId) filtered = filtered.filter(e => e.tenantId === q.tenantId);
  if (q.category) filtered = filtered.filter(e => e.category === q.category);
  if (q.metric) filtered = filtered.filter(e => e.metric === q.metric);
  if (q.since) {
    const sinceMs = new Date(q.since).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
  }
  if (q.until) {
    const untilMs = new Date(q.until).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() <= untilMs);
  }

  const total = filtered.length;
  const offset = q.offset || 0;
  const limit = Math.min(q.limit || 100, 1000);
  return { events: filtered.slice(offset, offset + limit), total };
}

/**
 * Get event buffer stats (for health endpoint).
 */
export function getEventBufferStats(tenantId?: string): {
  totalEvents: number;
  oldestTimestamp: string | null;
  newestTimestamp: string | null;
  categoryCounts: Record<string, number>;
} {
  const filtered = tenantId ? eventBuffer.filter((e) => e.tenantId === tenantId) : eventBuffer;
  const categoryCounts: Record<string, number> = {};
  for (const e of filtered) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }
  return {
    totalEvents: filtered.length,
    oldestTimestamp: filtered.length > 0 ? filtered[0].timestamp : null,
    newestTimestamp: filtered.length > 0 ? filtered[filtered.length - 1].timestamp : null,
    categoryCounts,
  };
}

/**
 * Export analytics events as CSV.
 */
export function exportAnalyticsEventsCsv(q: AnalyticsEventQuery): string {
  const { events } = queryAnalyticsEvents({ ...q, limit: 100000 });
  const header = "id,timestamp,category,metric,value,unit,tenantId,facilityId,actorHash,target,method,statusCode";
  const rows = events.map(e =>
    [
      e.id, e.timestamp, e.category, e.metric, e.value, e.unit,
      e.tenantId, e.facilityId || "", e.actorHash || "",
      e.target || "", e.method || "", e.statusCode ?? "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
