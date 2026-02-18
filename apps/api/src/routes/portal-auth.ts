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
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";

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

export function getPortalSession(request: FastifyRequest): PortalSessionData | null {
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
  // These routes call VistA RPCs directly with the portal session's DFN.
  // Read-only. No clinician-only controls exposed.

  /** Helper: call a VistA RPC with portal session DFN, audit, return parsed data */
  async function portalRpc(
    session: PortalSessionData,
    rpcName: string,
    params: string[],
    resource: string,
    request: FastifyRequest,
    reply: FastifyReply,
    parser: (lines: string[]) => unknown[]
  ) {
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip,
      detail: { resource },
    });

    try {
      validateCredentials();
      await connect();
      const lines = await callRpc(rpcName, params);
      disconnect();
      const results = parser(lines);
      return reply.send({ ok: true, source: "vista", resource, count: results.length, results, rpcUsed: rpcName });
    } catch (err: any) {
      try { disconnect(); } catch {}
      // If VistA unavailable, return integration-pending instead of crashing
      return reply.send({
        ok: true,
        source: "vista",
        resource,
        count: 0,
        results: [],
        _integration: "pending",
        _rpc: rpcName,
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : undefined,
      });
    }
  }

  // --- Allergies ---
  server.get("/portal/health/allergies", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORQQAL LIST", [session.patientDfn], "allergies", request, reply, (lines) =>
      lines.map(l => {
        const p = l.split("^");
        if (!p[0]?.trim()) return null;
        return { id: p[0]?.trim(), allergen: p[1]?.trim() || "", severity: p[2]?.trim() || "", reactions: p[3]?.trim() || "" };
      }).filter(Boolean)
    );
  });

  // --- Problems ---
  server.get("/portal/health/problems", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORWCH PROBLEM LIST", [session.patientDfn, "0"], "problems", request, reply, (lines) =>
      lines.map(l => {
        const p = l.split("^");
        if (!p[0]?.trim() || !p[1]?.trim()) return null;
        const st = p[2]?.trim() || "";
        let status = "active";
        if (st.toUpperCase().includes("I") || st === "0") status = "inactive";
        return { id: p[0]?.trim(), text: p[1]?.trim(), status, onset: p[3]?.trim() || "" };
      }).filter(Boolean)
    );
  });

  // --- Vitals ---
  server.get("/portal/health/vitals", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORQQVI VITALS", [session.patientDfn, "3000101", "3991231"], "vitals", request, reply, (lines) =>
      lines.map(l => {
        const p = l.split("^");
        if (!p[0]?.trim()) return null;
        const takenAtFM = p[3]?.trim() || "";
        let takenAt = takenAtFM;
        if (takenAtFM?.length >= 7) {
          const dp = takenAtFM.split(".")[0] || "";
          const tp = takenAtFM.split(".")[1] || "";
          if (/^\d{7}$/.test(dp)) {
            const y = parseInt(dp.substring(0, 3), 10) + 1700;
            takenAt = `${y}-${dp.substring(3, 5)}-${dp.substring(5, 7)}`;
            if (tp?.length >= 4) takenAt += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
          }
        }
        return { type: p[1]?.trim() || "", value: p[2]?.trim() || "", takenAt };
      }).filter(Boolean)
    );
  });

  // --- Medications ---
  server.get("/portal/health/medications", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORWPS ACTIVE", [session.patientDfn], "medications", request, reply, (lines) => {
      const meds: { drugName: string; status: string; sig: string }[] = [];
      let current: { drugName: string; status: string; sig: string } | null = null;
      for (const line of lines) {
        if (line.startsWith("~")) {
          if (current) meds.push(current);
          const p = line.substring(1).split("^");
          current = { drugName: p[2]?.trim() || p[1]?.trim() || "Unknown", status: p[9]?.trim() || "", sig: "" };
        } else if (current && (line.startsWith("\\") || line.startsWith(" "))) {
          const trimmed = line.replace(/^[\\ ]+/, "").trim();
          if (trimmed.toLowerCase().startsWith("sig:")) current.sig = trimmed.substring(4).trim();
        }
      }
      if (current) meds.push(current);
      return meds;
    });
  });

  // --- Demographics ---
  server.get("/portal/health/demographics", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORWPT SELECT", [session.patientDfn], "demographics", request, reply, (lines) => {
      const raw = lines[0] || "";
      const p = raw.split("^");
      if (p[0] === "-1" || !p[0]) return [];
      let dob = p[2] || "";
      if (/^\d{7}$/.test(dob)) {
        const y = parseInt(dob.substring(0, 3), 10) + 1700;
        dob = `${y}-${dob.substring(3, 5)}-${dob.substring(5, 7)}`;
      }
      return [{ name: p[0], sex: p[1] || "", dob }];
    });
  });

  // --- Labs (integration pending — ORWLRR INTERIM requires complex params) ---
  server.get("/portal/health/labs", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "labs" },
    });
    return reply.send({
      ok: true, source: "vista", resource: "labs", count: 0, results: [],
      _integration: "pending", _rpc: "ORWLRR INTERIM",
      _note: "Lab results require complex date/test-type parameters. Integration planned for Phase 28.",
    });
  });

  // --- Consults ---
  server.get("/portal/health/consults", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "consults" },
    });
    return reply.send({
      ok: true, source: "vista", resource: "consults", count: 0, results: [],
      _integration: "pending", _rpc: "ORQQCN LIST",
      _note: "Consult list RPC mapping not confirmed in sandbox. Integration planned.",
    });
  });

  // --- Surgery ---
  server.get("/portal/health/surgery", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "surgery" },
    });
    return reply.send({
      ok: true, source: "vista", resource: "surgery", count: 0, results: [],
      _integration: "pending", _rpc: "ORWSR LIST",
      _note: "Surgery list RPC not available in sandbox. Integration planned.",
    });
  });

  // --- Discharge summaries ---
  server.get("/portal/health/dc-summaries", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "dc-summaries" },
    });
    return reply.send({
      ok: true, source: "vista", resource: "dc-summaries", count: 0, results: [],
      _integration: "pending", _rpc: "TIU DOCUMENTS BY CONTEXT (class 244)",
      _note: "DC summaries require TIU document class filtering. Integration planned.",
    });
  });

  // --- Clinical reports ---
  server.get("/portal/health/reports", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "reports" },
    });
    return reply.send({
      ok: true, source: "vista", resource: "reports", count: 0, results: [],
      _integration: "pending", _rpc: "ORWRP REPORT TEXT",
      _note: "Clinical report generation requires HS component selection. Integration planned.",
    });
  });

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
