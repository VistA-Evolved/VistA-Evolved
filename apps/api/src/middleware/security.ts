/**
 * Security & observability middleware — Phase 15A/D.
 *
 * Fastify hooks for:
 *   - Request correlation IDs (X-Request-Id)
 *   - Request/response logging with redaction
 *   - Global error handler with structured responses
 *   - Rate limiting (per-IP, per-endpoint bucket)
 *   - Security headers (basic hardening)
 *   - Graceful shutdown
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID, randomBytes } from "crypto";
import { log, setRequestId, clearRequestId, runWithRequestId } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { RATE_LIMIT_CONFIG, CSRF_CONFIG } from "../config/server-config.js";
import { getSession } from "../auth/session-store.js";
import type { SessionData } from "../auth/session-store.js";
import { disconnect as disconnectRpcBroker } from "../vista/rpcBrokerClient.js";
import { stopAggregationJob } from "../services/analytics-aggregator.js";
import { stopRoomCleanup } from "../telehealth/room-store.js";
import { stopCleanupJob as stopPortabilityCleanup } from "../services/record-portability-store.js";
import { stopEtl } from "../services/analytics-etl.js";
// Phase 36: Telemetry
import { getCurrentTraceId } from "../telemetry/tracing.js";
import {
  httpRequestDuration, httpRequestsTotal, httpActiveRequests,
  errorsTotal, sanitizeRoute,
} from "../telemetry/metrics.js";
import { shutdownTracing } from "../telemetry/tracing.js";
import { closeDb } from "../platform/db/db.js";
import { closePgDb } from "../platform/pg/pg-db.js";

/* ================================================================== */
/* CORS origin allowlist                                                */
/* ================================================================== */

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

/**
 * Return a CORS origin validator function for @fastify/cors.
 * In production, only origins in the allowlist are accepted.
 * In development, the allowlist defaults to localhost:3000/3001.
 */
export function corsOriginValidator(origin: string, cb: (err: Error | null, allow?: boolean) => void): void {
  // No origin header (same-origin, server-to-server, curl) -- allow
  if (!origin) return cb(null, true);
  if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
  // In development, allow any localhost
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return cb(null, true);
  }
  cb(new Error("CORS origin not allowed"), false);
}

/* ================================================================== */
/* Auth gateway — path-based auth requirements                          */
/* ================================================================== */

type AuthLevel = "none" | "session" | "admin" | "service";

interface AuthRule {
  pattern: RegExp;
  auth: AuthLevel;
}

/**
 * Routes that require no authentication (health checks, auth flow, etc.).
 * Routes are matched top-to-bottom; first match wins.
 */
const AUTH_RULES: AuthRule[] = [
  { pattern: /^\/(health|ready|vista\/ping|metrics(\/prometheus)?|version)$/, auth: "none" },
  { pattern: /^\/auth\//, auth: "none" },
  { pattern: /^\/imaging\/ingest\/callback$/, auth: "service" }, // Phase 23: Orthanc webhook (X-Service-Key)
  { pattern: /^\/imaging\/health$/, auth: "session" }, // Phase 24: imaging health check
  { pattern: /^\/imaging\/devices/, auth: "session" }, // Phase 24: device registry (imaging_admin checked in handler)
  { pattern: /^\/imaging\/audit/, auth: "session" }, // Phase 24: imaging audit (imaging_admin checked in handler)
  { pattern: /^\/security\/break-glass/, auth: "session" }, // Phase 24: break-glass
  { pattern: /^\/analytics\//, auth: "session" }, // Phase 25: analytics (permission checked in handler)
  { pattern: /^\/iam\/oidc\/config$/, auth: "none" }, // Phase 35: OIDC discovery (public)
  { pattern: /^\/iam\/health$/, auth: "session" }, // Phase 35: IAM health
  { pattern: /^\/iam\//, auth: "session" }, // Phase 35: IAM routes (role checked in handler)
  { pattern: /^\/portal\/auth\//, auth: "none" }, // Phase 26: portal login/logout/session (own auth)
  { pattern: /^\/portal\//, auth: "none" }, // Phase 26: portal routes (own session check in handler)
  { pattern: /^\/telehealth\/health$/, auth: "session" }, // Phase 30: telehealth health (clinician)
  { pattern: /^\/telehealth\/device-check\//, auth: "none" }, // Phase 30: device check requirements (public)
  { pattern: /^\/telehealth\//, auth: "session" }, // Phase 30: telehealth rooms (clinician session)
  { pattern: /^\/api\/capabilities/, auth: "session" }, // Phase 37C: capability resolution (session)
  { pattern: /^\/api\/modules/, auth: "session" }, // Phase 37C: module status (admin checked in handler)
  { pattern: /^\/api\/adapters/, auth: "session" }, // Phase 37C: adapter info (admin checked in handler)
  { pattern: /^\/api\/marketplace/, auth: "session" }, // Phase 51: marketplace config (admin checked in handler)
  { pattern: /^\/migration\//, auth: "session" }, // Phase 50: Migration toolkit (permission checked in handler)
  { pattern: /^\/rcm\//, auth: "session" }, // Phase 38: RCM routes (permission checked in handler)
  { pattern: /^\/payerops\//, auth: "session" }, // Phase 92: Payment tracking + reconciliation + payer intelligence
  { pattern: /^\/scheduling\//, auth: "session" }, // Phase 63: Scheduling routes (session required)
  { pattern: /^\/messaging\/portal\//, auth: "none" }, // Phase 64: Portal messaging (own session check)
  { pattern: /^\/messaging\//, auth: "session" }, // Phase 64: Secure messaging (clinician session)
  { pattern: /^\/emar\//, auth: "session" }, // Phase 85: eMAR + BCMA posture (session required)
  { pattern: /^\/handoff\//, auth: "session" }, // Phase 86: Shift handoff + signout (session required)
  { pattern: /^\/qa\//, auth: "none" }, // Phase 96B: QA routes (own NODE_ENV/QA_ROUTES_ENABLED guard)
  { pattern: /^\/__test__\//, auth: "none" }, // Phase 96B: test-only trace endpoint (own guard)
  { pattern: /^\/posture\//, auth: "admin" }, // Phase 107: production posture (admin only)
  { pattern: /^\/posture$/, auth: "admin" }, // Phase 107: unified posture endpoint
  { pattern: /^\/admin\/my-tenant$/, auth: "session" }, // Phase 17: client tenant config (any user)
  { pattern: /^\/(admin|audit|reports)\//, auth: "admin" },
  { pattern: /^\/ws\//, auth: "session" }, // WebSocket console (has own role check too)
  { pattern: /^\/vista\/interop\//, auth: "admin" }, // Phase 21: interop telemetry requires admin/provider
  { pattern: /^\/vista\//, auth: "session" },
  // Default: session required for anything else
];

const COOKIE_NAME = process.env.SESSION_COOKIE || "ehr_session";

/** Extract session token from cookie or Authorization header. */
function extractToken(request: FastifyRequest): string | null {
  const cookie = (request as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  const auth = request.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/** Attach resolved session to request for downstream use. */
declare module "fastify" {
  interface FastifyRequest {
    session?: SessionData;
  }
}

/* ================================================================== */
/* Rate limit state                                                     */
/* ================================================================== */

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

// Cleanup old buckets every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, 60_000);

function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number; resetAt: number } {
  const isLogin = endpoint === "/auth/login";
  const maxReq = isLogin ? RATE_LIMIT_CONFIG.loginMax : RATE_LIMIT_CONFIG.generalMax;
  const key = `${ip}::${isLogin ? "login" : "general"}`;
  const now = Date.now();

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_CONFIG.windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, maxReq - bucket.count);
  return { allowed: bucket.count <= maxReq, remaining, resetAt: bucket.resetAt };
}

/* ================================================================== */
/* Error message sanitization                                           */
/* ================================================================== */

/** Remove VistA internal details, stack traces, and file paths from client-facing errors. */
function sanitizeClientError(msg: string): string {
  if (!msg) return "Request failed";
  // Strip file paths
  let s = msg.replace(/[A-Za-z]:\\[^\s]+/g, "[path]");
  s = s.replace(/\/[a-z][^\s]*/gi, "[path]");
  // Strip VistA-internal references
  s = s.replace(/\^[A-Z][A-Z0-9]*/g, "[routine]");
  // Limit length
  if (s.length > 200) s = s.slice(0, 200) + "...";
  return s;
}

/* ================================================================== */
/* Plugin registration                                                  */
/* ================================================================== */

/**
 * Register all security and observability hooks on the Fastify instance.
 */
export async function registerSecurityMiddleware(server: FastifyInstance): Promise<void> {

  /* ---- Request ID + logging ---- */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate or inherit request ID
    const incoming = request.headers["x-request-id"];
    const requestId = typeof incoming === "string" && incoming.length > 0
      ? incoming
      : randomUUID();

    // Store on request for downstream access
    (request as any).requestId = requestId;
    setRequestId(requestId);

    // Expose in response
    reply.header("X-Request-Id", requestId);

    // Phase 36: trace ID header
    const traceId = getCurrentTraceId();
    if (traceId) reply.header("X-Trace-Id", traceId);

    // Phase 36: track active requests
    httpActiveRequests.inc();
  });

  /* ---- Security headers ---- */
  server.addHook("onRequest", async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0"); // Modern: let CSP handle it
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    reply.header("Cache-Control", "no-store"); // PHI: never cache API responses
    reply.header("Pragma", "no-cache");
  });

  /* ---- Rate limiting ---- */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip || "unknown";
    const url = request.url.split("?")[0]; // Strip query params  
    const { allowed, remaining, resetAt } = checkRateLimit(ip, url);

    reply.header("X-RateLimit-Remaining", String(remaining));
    reply.header("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      log.warn("Rate limit exceeded", { ip, url });
      audit("security.rate-limited", "denied", { duz: "anonymous" }, {
        sourceIp: ip,
        detail: { url },
      });
      (request as any)._rejected = true;
      reply.code(429).send({
        ok: false,
        error: "Too many requests",
        retryAfterMs: resetAt - Date.now(),
      });
      return;
    }
  });

  /* ---- Auth gateway (path-based authentication + authorization) ---- */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;
    const url = request.url.split("?")[0];

    // Determine required auth level
    let requiredAuth: AuthLevel = "session"; // default
    for (const rule of AUTH_RULES) {
      if (rule.pattern.test(url)) {
        requiredAuth = rule.auth;
        break;
      }
    }

    if (requiredAuth === "none") return;

    // Service auth — X-Service-Key header (Phase 23: ingest callbacks)
    if (requiredAuth === "service") {
      // Service endpoints bypass session auth — validated in route handler
      return;
    }

    // Extract and validate session
    const token = extractToken(request);
    if (!token) {
      (request as any)._rejected = true;
      reply.code(401).send({ ok: false, error: "Authentication required" });
      return;
    }

    const session = getSession(token);
    if (!session) {
      (request as any)._rejected = true;
      reply.code(401).send({ ok: false, error: "Session expired or invalid" });
      return;
    }

    // Attach session to request for downstream audit attribution
    request.session = session;

    // Admin role check -- strict admin-only (AGENTS.md #24 RBAC tightening)
    if (requiredAuth === "admin") {
      if (session.role !== "admin") {
        audit("security.rbac-denied", "denied", {
          duz: session.duz, name: session.userName, role: session.role,
        }, { sourceIp: request.ip, detail: { url, requiredRole: "admin" } });
        (request as any)._rejected = true;
        reply.code(403).send({ ok: false, error: "Insufficient privileges" });
        return;
      }
    }
  });

  /* ---- Origin check for state-changing requests ---- */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;
    // Only check POST/PUT/DELETE/PATCH
    if (!["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) return;

    const origin = request.headers.origin;
    // No origin header (same-origin requests, curl, server-to-server) -- allow
    if (!origin) return;

    // Check allowlist
    if (ALLOWED_ORIGINS.has(origin)) return;
    // Dev mode: allow localhost
    if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return;

    log.warn("Origin check failed", { origin, url: request.url, ip: request.ip });
    audit("security.origin-rejected", "denied", {
      duz: (request.session as any)?.duz || "anonymous",
    }, { sourceIp: request.ip, detail: { origin, url: request.url } });

    (request as any)._rejected = true;
    reply.code(403).send({ ok: false, error: "Origin not allowed" });
  });

  /* ---- CSRF double-submit cookie (Phase 49) ---- */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;
    const CSRF_COOKIE = CSRF_CONFIG.cookieName;
    const CSRF_HEADER = CSRF_CONFIG.headerName;

    // Always ensure CSRF token cookie exists (set on every response)
    let csrfToken = (request as any).cookies?.[CSRF_COOKIE];
    if (!csrfToken) {
      csrfToken = randomBytes(CSRF_CONFIG.tokenBytes).toString("hex");
      reply.setCookie(CSRF_COOKIE, csrfToken, {
        path: "/",
        httpOnly: false, // JS must be able to read this to send as header
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 28800, // 8 hours
      });
    }

    // Safe methods don't need CSRF validation
    if ((CSRF_CONFIG.safeMethods as readonly string[]).includes(request.method)) return;

    // Auth endpoints are exempt (login doesn't have a CSRF token yet)
    const url = request.url.split("?")[0];
    if (url.startsWith("/auth/")) return;
    // Service-to-service callbacks are exempt
    if (url === "/imaging/ingest/callback") return;
    // Health/metrics/version are exempt
    if (/^\/(health|ready|vista\/ping|metrics|version)/.test(url)) return;

    // Validate: header must match cookie
    const headerToken = request.headers[CSRF_HEADER] as string | undefined;
    if (!headerToken || headerToken !== csrfToken) {
      log.warn("CSRF validation failed", {
        url,
        ip: request.ip,
        hasCookie: !!csrfToken,
        hasHeader: !!headerToken,
      });
      audit("security.csrf-failed", "denied", {
        duz: (request as any).session?.duz || "anonymous",
      }, { sourceIp: request.ip, detail: { url } });
      reply.code(403).send({ ok: false, error: "CSRF token mismatch" });
      return;
    }
  });

  /* ---- Response scrubber: sanitize error messages before they reach the client ---- */
  server.addHook("onSend", async (_request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
    if (typeof payload !== "string") return payload;
    try {
      const parsed = JSON.parse(payload);
      if (parsed && parsed.ok === false && typeof parsed.error === "string") {
        parsed.error = sanitizeClientError(parsed.error);
        return JSON.stringify(parsed);
      }
    } catch {
      // Not JSON — pass through
    }
    return payload;
  });

  /* ---- Request logging ---- */
  server.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = reply.elapsedTime;
    const logData = {
      method: request.method,
      url: request.url.split("?")[0],
      statusCode: reply.statusCode,
      durationMs: Math.round(duration),
      ip: request.ip,
      requestId: (request as any).requestId,
    };

    if (reply.statusCode >= 500) {
      log.error("Request completed (5xx)", logData);
      errorsTotal.inc({ category: "http_5xx" });
    } else if (reply.statusCode >= 400) {
      log.warn("Request completed (4xx)", logData);
    } else {
      log.info("Request completed", logData);
    }

    // Phase 36: Prometheus metrics
    const route = sanitizeRoute(request.url);
    const method = request.method;
    const statusCode = String(reply.statusCode);
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpActiveRequests.dec();

    clearRequestId();
  });

  /* ---- Global error handler (never leak stack traces or VistA internals) ---- */
  server.setErrorHandler(async (error: Error & { statusCode?: number; validation?: unknown }, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = (error as any).statusCode || 500;
    const requestId = (request as any).requestId || "unknown";

    // Log full detail server-side (redacted)
    log.error("Unhandled error", {
      error: error.message,
      statusCode,
      url: request.url,
      method: request.method,
      requestId,
    });

    // Client response: generic message for 5xx, sanitized for 4xx
    const clientError = statusCode >= 500
      ? "Internal server error"
      : sanitizeClientError(error.message);

    reply.code(statusCode).send({
      ok: false,
      error: clientError,
      requestId,
    });
  });

  /* ---- Graceful shutdown ---- */
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, async () => {
      log.info("Graceful shutdown initiated", { signal });
      audit("system.shutdown", "success", { duz: "system", name: "system", role: "system" }, {
        detail: { signal },
      });

      // Phase 36: drain timeout -- force exit if graceful close takes too long
      const DRAIN_TIMEOUT_MS = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS) || 30_000;
      const drainTimer = setTimeout(() => {
        log.error("Graceful shutdown timed out, forcing exit", { drainTimeoutMs: DRAIN_TIMEOUT_MS });
        process.exit(1);
      }, DRAIN_TIMEOUT_MS);
      drainTimer.unref(); // don't keep process alive just for this timer

      try {
        await server.close();
        // Phase 21: disconnect RPC broker to prevent orphaned VistA jobs
        try { disconnectRpcBroker(); } catch { /* socket may already be closed */ }
        // Phase 25: stop analytics aggregation job and ETL writer
        try { stopAggregationJob(); } catch { /* timer may already be cleared */ }
        try { stopEtl(); } catch { /* connection may already be closed */ }
        // Phase 30: stop telehealth room cleanup timer
        try { stopRoomCleanup(); } catch { /* timer may already be cleared */ }
        // Phase 80: stop record portability cleanup timer
        try { stopPortabilityCleanup(); } catch { /* timer may already be cleared */ }
        // Phase 95B: close platform SQLite DB
        try { closeDb(); } catch { /* DB may already be closed */ }
        // Phase 101: close platform Postgres pool
        try { await closePgDb(); } catch { /* pool may already be closed */ }
        // Phase 116: stop Graphile Worker job runner
        try {
          const { stopJobRunner } = await import("../jobs/runner.js");
          await stopJobRunner();
        } catch { /* runner may not be started */ }
        // Phase 36: flush OTel traces/metrics
        try { await shutdownTracing(); } catch { /* best effort */ }
        log.info("Server closed gracefully");
      } catch (err: any) {
        log.error("Error during shutdown", { error: err.message });
      }
      clearTimeout(drainTimer);
      process.exit(0);
    });
  }

  log.info("Security middleware registered", {
    features: ["request-ids", "security-headers", "rate-limiting", "auth-gateway", "origin-check", "csrf-double-submit", "error-handler", "graceful-shutdown"],
  });
}
