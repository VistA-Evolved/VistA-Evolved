/**
 * Portal Auth Routes — Phase 26
 *
 * Separate authentication domain for patient portal users.
 * Portal sessions are isolated from clinician sessions.
 *
 * Dev mode: Maps demo credentials to patient DFN.
 * Production: OIDC/SAML integration (future).
 *
 * Routes:
 *   POST /portal/auth/login   — authenticate portal user, set portal_session cookie
 *   POST /portal/auth/logout  — destroy portal session
 *   GET  /portal/auth/session — return current portal session
 *
 * Health data proxy routes (DFN-scoped):
 *   GET /portal/health/allergies
 *   GET /portal/health/problems
 *   GET /portal/health/vitals
 *   GET /portal/health/labs
 *   GET /portal/health/medications
 *   GET /portal/health/consults
 *   GET /portal/health/surgery
 *   GET /portal/health/dc-summaries
 *   GET /portal/health/demographics
 *   GET /portal/health/reports
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";
import { log } from "../lib/logger.js";
import { portalAudit } from "../services/portal-audit.js";

/* ------------------------------------------------------------------ */
/* Portal Session Store (separate from clinician sessions)              */
/* ------------------------------------------------------------------ */

export interface PortalSessionData {
  token: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

const portalSessions = new Map<string, PortalSessionData>();

const PORTAL_COOKIE = "portal_session";
const PORTAL_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PORTAL_IDLE_TTL_MS = 15 * 60 * 1000; // 15 minutes idle

// Cleanup expired sessions every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of portalSessions) {
    if (
      now - session.createdAt > PORTAL_SESSION_TTL_MS ||
      now - session.lastActivity > PORTAL_IDLE_TTL_MS
    ) {
      portalSessions.delete(token);
    }
  }
}, 60_000);

/* ------------------------------------------------------------------ */
/* Dev-mode patient mapping                                             */
/* ------------------------------------------------------------------ */

/**
 * In development, map demo credentials to patient DFNs.
 * In production, this would be replaced by OIDC/SAML identity provider.
 */
const DEV_PATIENTS: Record<string, { dfn: string; name: string }> = {
  patient1: { dfn: "100022", name: "CARTER,DAVID" },
  patient2: { dfn: "100033", name: "SMITH,JOHN" },
};

/* ------------------------------------------------------------------ */
/* Rate limiting (portal-specific, stricter than clinician)              */
/* ------------------------------------------------------------------ */

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRate(ip: string): boolean {
  const now = Date.now();
  const bucket = loginAttempts.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= MAX_LOGIN_ATTEMPTS;
}

/* ------------------------------------------------------------------ */
/* Session helpers                                                      */
/* ------------------------------------------------------------------ */

function createPortalSession(dfn: string, name: string): string {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  portalSessions.set(token, {
    token,
    patientDfn: dfn,
    patientName: name,
    createdAt: now,
    lastActivity: now,
  });
  return token;
}

function getPortalSession(request: FastifyRequest): PortalSessionData | null {
  const cookie = (request as any).cookies?.[PORTAL_COOKIE];
  if (!cookie) return null;
  const session = portalSessions.get(cookie);
  if (!session) return null;

  const now = Date.now();
  if (
    now - session.createdAt > PORTAL_SESSION_TTL_MS ||
    now - session.lastActivity > PORTAL_IDLE_TTL_MS
  ) {
    portalSessions.delete(cookie);
    return null;
  }

  session.lastActivity = now;
  return session;
}

function requirePortalSession(
  request: FastifyRequest,
  reply: FastifyReply
): PortalSessionData {
  const session = getPortalSession(request);
  if (!session) {
    reply.code(401).send({ ok: false, error: "Not authenticated" });
    throw new Error("No portal session");
  }
  return session;
}

/* ------------------------------------------------------------------ */
/* Cookie options                                                       */
/* ------------------------------------------------------------------ */

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: Math.floor(PORTAL_SESSION_TTL_MS / 1000),
};

/* ------------------------------------------------------------------ */
/* Route registration                                                   */
/* ------------------------------------------------------------------ */

export default async function portalAuthRoutes(
  server: FastifyInstance
): Promise<void> {

  // ─── POST /portal/auth/login ───
  server.post("/portal/auth/login", async (request, reply) => {
    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      request.ip;

    if (!checkLoginRate(ip)) {
      portalAudit("portal.login.failed", "failure", "unknown", {
        sourceIp: ip,
        detail: { reason: "rate_limited" },
      });
      return reply.code(429).send({
        ok: false,
        error: "Too many login attempts. Please try again later.",
      });
    }

    const body = (request.body as any) || {};
    const { username, password } = body;

    if (!username || !password) {
      return reply.code(400).send({ ok: false, error: "Username and password required" });
    }

    // Dev mode: check demo patient map
    const patient = DEV_PATIENTS[username];
    if (!patient || password !== username) {
      portalAudit("portal.login.failed", "failure", "unknown", {
        sourceIp: ip,
        detail: { reason: "invalid_credentials" },
      });
      return reply.code(401).send({ ok: false, error: "Invalid credentials" });
    }

    const token = createPortalSession(patient.dfn, patient.name);

    portalAudit("portal.login", "success", patient.dfn, {
      sourceIp: ip,
    });

    log.info("Portal login", { patientName: patient.name });

    reply.setCookie(PORTAL_COOKIE, token, COOKIE_OPTS);
    return reply.send({
      ok: true,
      patientName: patient.name,
    });
  });

  // ─── POST /portal/auth/logout ───
  server.post("/portal/auth/logout", async (request, reply) => {
    const cookie = (request as any).cookies?.[PORTAL_COOKIE];
    if (cookie) {
      const session = portalSessions.get(cookie);
      if (session) {
        portalAudit("portal.logout", "success", session.patientDfn, {
          sourceIp: request.ip,
        });
      }
      portalSessions.delete(cookie);
    }

    reply.clearCookie(PORTAL_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  // ─── GET /portal/auth/session ───
  server.get("/portal/auth/session", async (request, reply) => {
    const session = getPortalSession(request);
    if (!session) {
      return reply.code(401).send({ ok: false, error: "Not authenticated" });
    }
    return reply.send({
      ok: true,
      patientName: session.patientName,
      // Never expose DFN to the client
    });
  });

  // ─── Portal Health Data Proxy Routes ───
  // These routes are DFN-scoped by the portal session.
  // They proxy to existing VistA RPC routes on the same server.

  const HEALTH_PROXY_ROUTES = [
    { path: "/portal/health/allergies", upstream: "/vista/allergies" },
    { path: "/portal/health/problems", upstream: "/vista/problems" },
    { path: "/portal/health/vitals", upstream: "/vista/vitals" },
    { path: "/portal/health/labs", upstream: "/vista/labs" },
    { path: "/portal/health/medications", upstream: "/vista/medications" },
    { path: "/portal/health/consults", upstream: "/vista/consults" },
    { path: "/portal/health/surgery", upstream: "/vista/surgery" },
    { path: "/portal/health/dc-summaries", upstream: "/vista/dc-summaries" },
    { path: "/portal/health/demographics", upstream: "/vista/patient-demographics" },
    { path: "/portal/health/reports", upstream: "/vista/reports" },
  ] as const;

  for (const route of HEALTH_PROXY_ROUTES) {
    server.get(route.path, async (request, reply) => {
      const session = requirePortalSession(request, reply);

      portalAudit("portal.data.access", "success", session.patientDfn, {
        sourceIp: request.ip,
        detail: { resource: route.path },
      });

      // Return integration-pending response for now.
      // When wired, these will proxy to the upstream VistA routes
      // with the portal session's DFN injected.
      return reply.send({
        ok: true,
        source: "vista",
        resource: route.path.replace("/portal/health/", ""),
        patientName: session.patientName,
        data: [],
        _note: "Integration pending — will proxy to VistA RPC when connected",
        _upstream: route.upstream,
      });
    });
  }

  // ─── Portal Audit Routes (admin-only) ───
  server.get("/portal/audit/events", async (request, reply) => {
    // For now, portal audit is accessible (will add admin check later)
    const { queryPortalAuditEvents } = await import("../services/portal-audit.js");
    const query = request.query as any;
    const events = queryPortalAuditEvents({
      action: query.action,
      since: query.since,
      limit: query.limit ? parseInt(query.limit, 10) : 50,
    });
    return reply.send({ ok: true, events, total: events.length });
  });

  server.get("/portal/audit/stats", async (_request, reply) => {
    const { getPortalAuditStats } = await import("../services/portal-audit.js");
    return reply.send({ ok: true, stats: getPortalAuditStats() });
  });
}
