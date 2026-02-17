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
import { randomUUID } from "crypto";
import { log, setRequestId, clearRequestId } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { RATE_LIMIT_CONFIG } from "../config/server-config.js";

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
      reply.code(429).send({
        ok: false,
        error: "Too many requests",
        retryAfterMs: resetAt - Date.now(),
      });
      return;
    }
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
    } else if (reply.statusCode >= 400) {
      log.warn("Request completed (4xx)", logData);
    } else {
      log.info("Request completed", logData);
    }

    clearRequestId();
  });

  /* ---- Global error handler ---- */
  server.setErrorHandler(async (error: Error & { statusCode?: number; validation?: unknown }, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = (error as any).statusCode || 500;
    const requestId = (request as any).requestId || "unknown";

    log.error("Unhandled error", {
      error: error.message,
      statusCode,
      url: request.url,
      method: request.method,
      requestId,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });

    reply.code(statusCode).send({
      ok: false,
      error: statusCode >= 500 ? "Internal server error" : error.message,
      requestId,
      ...(process.env.NODE_ENV !== "production" ? { detail: error.message } : {}),
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
      try {
        await server.close();
        log.info("Server closed gracefully");
      } catch (err: any) {
        log.error("Error during shutdown", { error: err.message });
      }
      process.exit(0);
    });
  }

  log.info("Security middleware registered", {
    features: ["request-ids", "security-headers", "rate-limiting", "error-handler", "graceful-shutdown"],
  });
}
