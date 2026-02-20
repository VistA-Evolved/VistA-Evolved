/**
 * Redacting structured logger — Phase 15A.
 *
 * Wraps console output with:
 *   - structured JSON or text output based on LOG_CONFIG
 *   - automatic redaction of credentials, tokens, PHI fields
 *   - request correlation ID support
 *   - log level filtering
 *
 * Usage:
 *   import { log } from "../lib/logger.js";
 *   log.info("Patient search", { dfn: "123", query: "SMITH" });
 *   log.warn("RPC timeout", { rpcName: "ORWPT LIST ALL", durationMs: 12000 });
 */

import { LOG_CONFIG, PHI_CONFIG } from "../config/server-config.js";
import { AsyncLocalStorage } from "async_hooks";
import { ALL_BLOCKED_FIELDS, INLINE_REDACT_PATTERNS as PHI_PATTERNS } from "./phi-redaction.js";

// Phase 36: lazy-load tracer to avoid circular imports
let _getTraceId: (() => string) | null = null;
let _getSpanId: (() => string) | null = null;

/** Called once from index.ts after tracing.ts is loaded. */
export function bridgeTracingToLogger(
  getTraceId: () => string,
  getSpanId: () => string,
): void {
  _getTraceId = getTraceId;
  _getSpanId = getSpanId;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  requestId?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Level ordering                                                      */
/* ------------------------------------------------------------------ */

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_CONFIG.level];
}

/* ------------------------------------------------------------------ */
/* Redaction engine                                                     */
/* ------------------------------------------------------------------ */

/** Fields that must never appear in any log output — centralized in phi-redaction.ts (Phase 48). */
const REDACT_FIELDS = ALL_BLOCKED_FIELDS;

/** Regex patterns for inline credential scrubbing — centralized in phi-redaction.ts (Phase 48). */
const INLINE_REDACT_PATTERNS = PHI_PATTERNS;

/**
 * Deep-redact an object: replaces sensitive field values with "[REDACTED]".
 * Returns a new object — never mutates the input.
 */
function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return "[MAX_DEPTH]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    let s = obj;
    for (const { pattern: pat } of INLINE_REDACT_PATTERNS) {
      s = s.replace(new RegExp(pat.source, pat.flags), "[REDACTED]");
    }
    return s;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, depth + 1));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lk = key.toLowerCase();
      if (REDACT_FIELDS.has(key) || REDACT_FIELDS.has(lk)) {
        result[key] = "[REDACTED]";
      } else if ((LOG_CONFIG.redactHeaders as readonly string[]).includes(lk)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactObject(value, depth + 1);
      }
    }
    return result;
  }

  return obj;
}

/* ------------------------------------------------------------------ */
/* Async-local request context (thread-safe under concurrency)          */
/* ------------------------------------------------------------------ */

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function setRequestId(id: string): void {
  // Legacy compat — called from onRequest hook.  The preferred API is
  // runWithRequestId() but setRequestId is kept for the existing hook.
  _requestId = id;
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId ?? _requestId;
}

export function clearRequestId(): void {
  _requestId = undefined;
}

/**
 * Run a callback in an async-local context that carries the request ID.
 * This is the concurrency-safe alternative to set/clearRequestId.
 */
export function runWithRequestId<T>(id: string, fn: () => T): T {
  return requestContext.run({ requestId: id }, fn);
}

/** @deprecated — module-global fallback; prefer runWithRequestId. */
let _requestId: string | undefined;

/* ------------------------------------------------------------------ */
/* Logger implementation                                                */
/* ------------------------------------------------------------------ */

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...(meta ? (redactObject(meta) as Record<string, unknown>) : {}),
  };

  const rid = getRequestId();
  if (rid) entry.requestId = rid;

  // Phase 36: inject OTel trace/span IDs for log correlation
  if (_getTraceId) {
    const traceId = _getTraceId();
    if (traceId) entry.traceId = traceId;
  }
  if (_getSpanId) {
    const spanId = _getSpanId();
    if (spanId) entry.spanId = spanId;
  }

  if (LOG_CONFIG.json) {
    const fn = level === "error" || level === "fatal" ? console.error
             : level === "warn" ? console.warn
             : console.log;
    fn(JSON.stringify(entry));
  } else {
    const prefix = `[${entry.timestamp}] ${level.toUpperCase().padEnd(5)}`;
    const rid = entry.requestId ? ` [${entry.requestId}]` : "";
    const metaStr = meta ? " " + JSON.stringify(redactObject(meta)) : "";
    const fn = level === "error" || level === "fatal" ? console.error
             : level === "warn" ? console.warn
             : console.log;
    fn(`${prefix}${rid} ${msg}${metaStr}`);
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export const log = {
  trace: (msg: string, meta?: Record<string, unknown>) => emit("trace", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  fatal: (msg: string, meta?: Record<string, unknown>) => emit("fatal", msg, meta),

  /** Create a child logger with pre-bound context. */
  child: (context: Record<string, unknown>) => ({
    trace: (msg: string, meta?: Record<string, unknown>) => emit("trace", msg, { ...context, ...meta }),
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, { ...context, ...meta }),
    info:  (msg: string, meta?: Record<string, unknown>) => emit("info", msg, { ...context, ...meta }),
    warn:  (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, { ...context, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, { ...context, ...meta }),
    fatal: (msg: string, meta?: Record<string, unknown>) => emit("fatal", msg, { ...context, ...meta }),
  }),
};

/** Redact an object for safe external exposure (e.g., audit events). */
export { redactObject };
