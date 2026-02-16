/**
 * Auth routes — Phase 13.
 *
 * POST /auth/login   — authenticate with VistA, create session
 * POST /auth/logout  — destroy session
 * GET  /auth/session — return current session info
 */

import type { FastifyInstance } from "fastify";
import { authenticateUser } from "../vista/rpcBrokerClient.js";
import {
  createSession,
  getSession,
  destroySession,
  mapUserRole,
  type SessionData,
} from "./session-store.js";

const COOKIE_NAME = "ehr_session";
const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  // Secure only in production (behind HTTPS)
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60, // 8 hours in seconds
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
    const body = request.body as any;
    const accessCode = body?.accessCode;
    const verifyCode = body?.verifyCode;

    if (!accessCode || !verifyCode) {
      return reply.code(400).send({
        ok: false,
        error: "Missing accessCode or verifyCode",
        hint: 'Body: { "accessCode": "PROV123", "verifyCode": "PROV123!!" }',
      });
    }

    try {
      // Authenticate against VistA
      const userInfo = await authenticateUser(accessCode, verifyCode);

      // Create session
      const role = mapUserRole(userInfo.userName);
      const token = createSession({
        duz: userInfo.duz,
        userName: userInfo.userName,
        role,
        facilityStation: userInfo.facilityStation,
        facilityName: userInfo.facilityName,
        divisionIen: userInfo.divisionIen,
      });

      // Set cookie
      reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);

      return {
        ok: true,
        session: {
          token,
          duz: userInfo.duz,
          userName: userInfo.userName,
          role,
          facilityStation: userInfo.facilityStation,
          facilityName: userInfo.facilityName,
          divisionIen: userInfo.divisionIen,
        },
      };
    } catch (err: any) {
      // Never log the credentials themselves
      console.error("[AUTH] Login failed:", err.message);
      return reply.code(401).send({
        ok: false,
        error: err.message || "Authentication failed",
      });
    }
  });

  // POST /auth/logout
  server.post("/auth/logout", async (request, reply) => {
    const token = extractToken(request);
    if (token) {
      destroySession(token);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
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
      },
    };
  });
}
