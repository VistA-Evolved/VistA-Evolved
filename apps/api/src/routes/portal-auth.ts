/**
 * Portal Auth Routes -- Phase 26, modernized Phase 150
 *
 * Separate authentication domain for patient portal users.
 * Portal sessions are isolated from clinician sessions.
 *
 * Dev mode: Maps demo credentials to patient DFN.
 * rc/prod:  Requires OIDC -- see runtime-mode.ts.
 *
 * Phase 150: In-memory Map is now a hot cache with PG write-through.
 * Tokens stored as SHA-256 hashes in the database. DFN never logged
 * in general log output (only in audit trail).
 *
 * Routes:
 *   POST /portal/auth/login   -- authenticate portal user, set portal_session cookie
 *   POST /portal/auth/logout  -- destroy portal session
 *   GET  /portal/auth/session -- return current portal session
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
import { randomBytes, randomUUID } from "node:crypto";
import { log } from "../lib/logger.js";
import { portalAudit } from "../services/portal-audit.js";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";
import {
  hashPortalToken,
  upsertPortalSession,
  revokePortalSession,
  touchPortalSession,
} from "../platform/pg/repo/pg-portal-session-repo.js";

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
  const sessionId = randomUUID();
  portalSessions.set(token, {
    token,
    patientDfn: dfn,
    patientName: name,
    createdAt: now,
    lastActivity: now,
  });

  // Phase 150: Write-through to PG (fire-and-forget)
  void upsertPortalSession({
    id: sessionId,
    tenantId: "default",
    tokenHash: hashPortalToken(token),
    userId: dfn,
    subject: "",
    patientDfn: dfn,
    dataJson: JSON.stringify({ patientName: name }),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + PORTAL_SESSION_TTL_MS).toISOString(),
    lastActivityAt: new Date(now).toISOString(),
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

  // Phase 150: Touch PG session timestamp (fire-and-forget, best-effort)
  void touchPortalSession(hashPortalToken(cookie));

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

    log.info("Portal login succeeded");

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
      // Phase 150: Revoke in PG (fire-and-forget)
      void revokePortalSession(hashPortalToken(cookie));
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

  // --- Immunizations (Phase 65: VistA-first, ORQQPX IMMUN LIST) ---
  server.get("/portal/health/immunizations", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORQQPX IMMUN LIST", [session.patientDfn], "immunizations", request, reply, (lines) =>
      lines.map(l => {
        const p = l.split("^");
        if (!p[0]?.trim()) return null;
        return { ien: p[0]?.trim(), name: p[1]?.trim() || "", dateTime: p[2]?.trim() || "", reaction: p[3]?.trim() || "" };
      }).filter(Boolean)
    );
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

  // --- Labs (Phase 61: wired to ORWLRR INTERIM) ---
  server.get("/portal/health/labs", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "labs" },
    });

    try {
      validateCredentials();
      await connect();
      // Params: DFN, startDate(FM), endDate(FM) -- empty strings fetch all
      const lines = await callRpc("ORWLRR INTERIM", [session.patientDfn, "", ""]);
      disconnect();
      // Parse structured lab results from caret-delimited or free-text lines
      const results: { testName: string; result: string; units: string; refRange: string; flag: string; specimen: string; collectionDate: string }[] = [];
      let currentSpecimen = "";
      let currentDate = "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^Specimen:/i.test(trimmed)) {
          currentSpecimen = trimmed.replace(/^Specimen:\s*/i, "").trim();
          continue;
        }
        if (/^(Collection\s+Date|Collected):/i.test(trimmed)) {
          currentDate = trimmed.replace(/^(Collection\s+Date|Collected):\s*/i, "").trim();
          continue;
        }
        if (trimmed.includes("^")) {
          const p = trimmed.split("^");
          if (p.length >= 2) {
            results.push({
              testName: (p[0] || "").trim(),
              result: (p[1] || "").trim(),
              units: (p[2] || "").trim(),
              refRange: (p[3] || "").trim(),
              flag: (p[4] || "").trim(),
              specimen: currentSpecimen,
              collectionDate: currentDate,
            });
          }
        }
      }
      const rawText = lines.join("\n");
      return reply.send({
        ok: true, source: "vista", resource: "labs",
        count: results.length, results, rawText,
        rpcUsed: "ORWLRR INTERIM",
        ...(results.length === 0 ? { note: "Lab results returned as free text; structured parsing found no caret-delimited entries" } : {}),
      });
    } catch (err: any) {
      try { disconnect(); } catch {}
      return reply.send({
        ok: true, source: "vista", resource: "labs",
        count: 0, results: [],
        _integration: "pending", _rpc: "ORWLRR INTERIM",
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : undefined,
      });
    }
  });

  // --- Consults (Phase 61: wired to ORQQCN LIST) ---
  server.get("/portal/health/consults", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORQQCN LIST", [session.patientDfn, "", "", "", ""], "consults", request, reply, (lines) => {
      if (lines.length === 0 || (lines.length === 1 && lines[0].startsWith("<"))) return [];
      return lines.map((line) => {
        const p = line.split("^");
        if (p.length < 5) return null;
        const id = p[0]?.trim();
        if (!id || !/^\d+$/.test(id)) return null;
        let date = p[1] || "";
        if (date && date.length >= 7) {
          const [dp, tp] = date.split(".");
          const y = parseInt(dp.substring(0, 3), 10) + 1700;
          date = `${y}-${dp.substring(3, 5)}-${dp.substring(5, 7)}`;
          if (tp && tp.length >= 4) date += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
        }
        return { id, date, status: (p[2] || "").trim(), service: (p[3] || "").trim(), type: (p[4] || "").trim() || "Consult" };
      }).filter(Boolean);
    });
  });

  // --- Surgery (Phase 61: wired to ORWSR LIST) ---
  server.get("/portal/health/surgery", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return portalRpc(session, "ORWSR LIST", [session.patientDfn, "", "", "-1", "999"], "surgery", request, reply, (lines) => {
      if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) return [];
      return lines.map((line) => {
        const p = line.split("^");
        if (p.length < 3) return null;
        const id = p[0]?.trim();
        if (!id) return null;
        const procedure = (p[1] || "").trim();
        let date = (p[2] || "").trim();
        if (date && date.length >= 7 && !date.includes("-")) {
          const [dp, tp] = date.split(".");
          const y = parseInt(dp.substring(0, 3), 10) + 1700;
          date = `${y}-${dp.substring(3, 5)}-${dp.substring(5, 7)}`;
          if (tp && tp.length >= 4) date += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
        }
        const surgeonField = (p[3] || "").trim();
        const surgeon = surgeonField.includes(";") ? surgeonField.split(";")[1] || surgeonField : surgeonField;
        return { id, procedure, date, surgeon, status: "Complete" };
      }).filter(Boolean);
    });
  });

  // --- Discharge summaries (Phase 61: wired to TIU DOCUMENTS BY CONTEXT, class=244) ---
  server.get("/portal/health/dc-summaries", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "dc-summaries" },
    });

    try {
      validateCredentials();
      await connect();
      // CLASS=244 for Discharge Summaries; merge signed (1) and unsigned (2)
      const signedLines = await callRpc("TIU DOCUMENTS BY CONTEXT", [
        "244", "1", session.patientDfn, "", "", "0", "0", "D",
      ]);
      const unsignedLines = await callRpc("TIU DOCUMENTS BY CONTEXT", [
        "244", "2", session.patientDfn, "", "", "0", "0", "D",
      ]);
      disconnect();
      const seenIens = new Set<string>();
      const allLines: string[] = [];
      for (const line of [...unsignedLines, ...signedLines]) {
        const ien = line.split("^")[0]?.trim();
        if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
          seenIens.add(ien);
          allLines.push(line);
        }
      }
      const results = allLines.map((line) => {
        const parts = line.split("^");
        if (parts.length < 7) return null;
        const id = parts[0].trim();
        if (!id || !/^\d+$/.test(id)) return null;
        const title = (parts[1] || "").replace(/^\+\s*/, "").trim();
        const fmDate = parts[2] || "";
        let date = fmDate;
        if (fmDate && fmDate.length >= 7) {
          const [datePart, timePart] = fmDate.split(".");
          const y = parseInt(datePart.substring(0, 3), 10) + 1700;
          date = `${y}-${datePart.substring(3, 5)}-${datePart.substring(5, 7)}`;
          if (timePart && timePart.length >= 4) date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
        }
        const authorField = parts[4] || "";
        const authorParts = authorField.split(";");
        const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
        return { id, title, date, author, location: parts[5] || "", status: parts[6] || "" };
      }).filter(Boolean);
      return reply.send({
        ok: true, source: "vista", resource: "dc-summaries",
        count: results.length, results,
        rpcUsed: "TIU DOCUMENTS BY CONTEXT",
      });
    } catch (err: any) {
      try { disconnect(); } catch {}
      return reply.send({
        ok: true, source: "vista", resource: "dc-summaries",
        count: 0, results: [],
        _integration: "pending", _rpc: "TIU DOCUMENTS BY CONTEXT (class 244)",
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : undefined,
      });
    }
  });

  // --- Clinical reports (Phase 61: wired to ORWRP REPORT TEXT) ---
  server.get("/portal/health/reports", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { reportId, hsType } = request.query as any;
    portalAudit("portal.data.access", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { resource: "reports", reportId },
    });

    // If no reportId, return available report list via ORWRP REPORT LISTS
    if (!reportId) {
      try {
        validateCredentials();
        await connect();
        const lines = await callRpc("ORWRP REPORT LISTS", []);
        disconnect();
        let currentSection = "";
        const reports: { id: string; heading: string; qualifier: string; category: string }[] = [];
        for (const line of lines) {
          if (line.includes("[REPORT LIST]")) { currentSection = "reportList"; continue; }
          if (line.includes("[")) { currentSection = "other"; continue; }
          if (currentSection === "reportList" && line.trim()) {
            const p = line.split("^");
            reports.push({
              id: (p[0] || "").trim(),
              heading: (p[1] || "").trim(),
              qualifier: (p[2] || "").trim(),
              category: (p[8] || "").trim(),
            });
          }
        }
        return reply.send({ ok: true, source: "vista", resource: "reports", count: reports.length, results: reports, rpcUsed: "ORWRP REPORT LISTS" });
      } catch (err: any) {
        try { disconnect(); } catch {}
        return reply.send({
          ok: true, source: "vista", resource: "reports",
          count: 0, results: [],
          _integration: "pending", _rpc: "ORWRP REPORT LISTS",
          _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : undefined,
        });
      }
    }

    // With reportId, fetch the report text
    try {
      validateCredentials();
      await connect();
      const lines = await callRpc("ORWRP REPORT TEXT", [
        session.patientDfn, String(reportId), String(hsType || ""), "", "0", "", "",
      ]);
      disconnect();
      return reply.send({
        ok: true, source: "vista", resource: "reports",
        text: lines.join("\n"),
        rpcUsed: "ORWRP REPORT TEXT",
      });
    } catch (err: any) {
      try { disconnect(); } catch {}
      return reply.send({
        ok: true, source: "vista", resource: "reports",
        count: 0, results: [],
        _integration: "pending", _rpc: "ORWRP REPORT TEXT",
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : undefined,
      });
    }
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
