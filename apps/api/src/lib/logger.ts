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

/** Fields that must never appear in any log output. */
const REDACT_FIELDS = new Set([
  ...LOG_CONFIG.redactBodyFields,
  ...PHI_CONFIG.neverLogFields,
  "password",
  "access_code",
  "verify_code",
]);

/** Regex patterns for inline credential scrubbing. */
const INLINE_REDACT_PATTERNS = [
  // Access;Verify code format used in XWB protocol
  /[A-Z0-9]+;[A-Z0-9!@#$%^&*]+/gi,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9+/=_-]{20,}/g,
  // Session tokens (64-char hex)
  /[0-9a-f]{64}/gi,
  // SSN patterns (XXX-XX-XXXX)
  /\b\d{3}-\d{2}-\d{4}\b/g,
];

/**
 * Deep-redact an object: replaces sensitive field values with "[REDACTED]".
 * Returns a new object — never mutates the input.
 */
function redactObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return "[MAX_DEPTH]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    let s = obj;
    for (const pat of INLINE_REDACT_PATTERNS) {
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
/* Async-local request context                                          */
/* ------------------------------------------------------------------ */

/** Current request ID — set per-request via Fastify onRequest hook. */
let _requestId: string | undefined;

export function setRequestId(id: string): void {
  _requestId = id;
}

export function getRequestId(): string | undefined {
  return _requestId;
}

export function clearRequestId(): void {
  _requestId = undefined;
}

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

  if (_requestId) entry.requestId = _requestId;

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
