/**
 * Auth routes — Phase 13 (hardened in Phase 15).
 *
 * POST /auth/login   — authenticate with VistA, create session, audit
 * POST /auth/logout  — destroy session, audit
 * GET  /auth/session — return current session info
 */

import type { FastifyInstance } from "fastify";
import { authenticateUser } from "../vista/rpcBrokerClient.js";
import {
  createSession,
  getSession,
  destroySession,
  rotateSession,
  mapUserRole,
  type SessionData,
} from "./session-store.js";
import { SESSION_CONFIG } from "../config/server-config.js";
import { resolveTenantId } from "../config/tenant-config.js";
import { log } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { LoginBodySchema, validate } from "../lib/validation.js";

const COOKIE_NAME = SESSION_CONFIG.cookieName;
const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: Math.floor(SESSION_CONFIG.absoluteTtlMs / 1000),
};

/** Extract session token from cookie or Authorization header. */
function extractToken(request: { cookies?: Record<string, string | undefined>; headers: Record<string, string | string[] | undefined> }): string | null {
  // Cookie first
  const cookie = (request as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  // Bearer token fallback
  const auth = request.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

/** Helper to require a valid session on a request.  Returns session or throws 401. */
export function requireSession(request: any, reply: any): SessionData {
  const token = extractToken(request);
  if (!token) {
    reply.code(401).send({ ok: false, error: "Not authenticated" });
    throw new Error("No session");
  }
  const session = getSession(token);
  if (!session) {
    reply.code(401).send({ ok: false, error: "Session expired or invalid" });
    throw new Error("Invalid session");
  }
  return session;
}

/** Helper to require a specific role. */
export function requireRole(session: SessionData, roles: string[], reply: any): void {
  if (!roles.includes(session.role)) {
    reply.code(403).send({ ok: false, error: "Insufficient privileges", requiredRoles: roles });
    throw new Error("Forbidden");
  }
}

export default async function authRoutes(server: FastifyInstance): Promise<void> {
  // POST /auth/login
  server.post("/auth/login", async (request, reply) => {
    const requestId = (request as any).requestId;
    const sourceIp = request.ip;

    // Phase 15A: Validate input with zod
    const parsed = validate(LoginBodySchema, request.body);
    if (!parsed.ok) {
      audit("security.invalid-input", "failure", { duz: "anonymous" }, {
        requestId, sourceIp, detail: { endpoint: "/auth/login", errors: parsed.details },
      });
      return reply.code(400).send({
        ok: false,
        error: "Invalid request body",
        details: parsed.details,
      });
    }

    const { accessCode, verifyCode } = parsed.data;

    try {
      // Authenticate against VistA
      const userInfo = await authenticateUser(accessCode, verifyCode);

      // Create session
      const role = mapUserRole(userInfo.userName);
      const tenantId = resolveTenantId(userInfo.facilityStation);
      const token = createSession({
        duz: userInfo.duz,
        userName: userInfo.userName,
        role,
        facilityStation: userInfo.facilityStation,
        facilityName: userInfo.facilityName,
        divisionIen: userInfo.divisionIen,
        tenantId,
      });

      // Rotate session token to prevent fixation (Phase 15B)
      const finalToken = SESSION_CONFIG.rotateOnLogin
        ? (rotateSession(token) ?? token)
        : token;

      // Set cookie (httpOnly — no JS access)
      reply.setCookie(COOKIE_NAME, finalToken, COOKIE_OPTS);

      // Phase 15C: Audit successful login
      audit("auth.login", "success", {
        duz: userInfo.duz, name: userInfo.userName, role,
      }, { requestId, sourceIp });

      log.info("User authenticated", { duz: userInfo.duz, role });

      // Phase 15B: Do NOT expose token in response body — cookie-only transport
      return {
        ok: true,
        session: {
          duz: userInfo.duz,
          userName: userInfo.userName,
          role,
          facilityStation: userInfo.facilityStation,
          facilityName: userInfo.facilityName,
          divisionIen: userInfo.divisionIen,
          tenantId,
        },
      };
    } catch (err: any) {
      // Phase 15C: Audit failed login (never log credentials)
      audit("auth.failed", "failure", { duz: "anonymous" }, {
        requestId, sourceIp, detail: { error: err.message },
      });
      log.warn("Login failed", { error: err.message, sourceIp });
      return reply.code(401).send({
        ok: false,
        error: "Authentication failed",
      });
    }
  });

  // POST /auth/logout
  server.post("/auth/logout", async (request, reply) => {
    const token = extractToken(request);
    const session = token ? getSession(token) : null;

    if (token) {
      destroySession(token);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });

    // Phase 15C: Audit logout
    audit("auth.logout", "success", {
      duz: session?.duz, name: session?.userName, role: session?.role,
    }, {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
    });

    return { ok: true };
  });

  // GET /auth/session
  server.get("/auth/session", async (request, reply) => {
    const token = extractToken(request);
    if (!token) {
      return { ok: false, authenticated: false };
    }
    const session = getSession(token);
    if (!session) {
      reply.clearCookie(COOKIE_NAME, { path: "/" });
      return { ok: false, authenticated: false };
    }
    return {
      ok: true,
      authenticated: true,
      session: {
        duz: session.duz,
        userName: session.userName,
        role: session.role,
        facilityStation: session.facilityStation,
        facilityName: session.facilityName,
        divisionIen: session.divisionIen,
        tenantId: session.tenantId,
      },
    };
  });
}
