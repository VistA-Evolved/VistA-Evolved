/**
 * Record Portability Routes — Phase 80
 *
 * Patient-facing record portability: export summaries, download, share, audit.
 * VistA-first: uses ORWRP REPORT TEXT / Health Summary RPCs where available,
 * falls back to section-level RPCs, and documents pending targets.
 *
 * Routes:
 *   POST /portal/record/export          — Generate summary, return token
 *   GET  /portal/record/export/:token   — Download by token
 *   GET  /portal/record/exports         — List patient's exports
 *   POST /portal/record/export/:token/revoke — Revoke an export
 *   POST /portal/record/share           — Create share link with TTL
 *   POST /portal/record/share/:id/revoke — Revoke share link
 *   GET  /portal/record/shares          — List patient's share links
 *   GET  /portal/record/share/audit     — Access audit for patient's shares
 *   GET  /portal/record/share/preview/:token  — Public: share preview
 *   POST /portal/record/share/verify/:token   — Public: verify + download
 *   GET  /portal/record/stats           — Portability stats
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";
import {
  buildTextPdf,
  formatAllergiesForPdf,
  formatProblemsForPdf,
  formatVitalsForPdf,
  formatMedicationsForPdf,
  formatDemographicsForPdf,
  formatImmunizationsForPdf,
  formatLabsForPdf,
} from "../services/portal-pdf.js";
import {
  createExport,
  downloadExport,
  getPatientExports,
  revokeExport,
  createRecordShare,
  getPatientShares,
  revokeRecordShare,
  verifyShareAccess,
  getSharePreview,
  getShareAudit,
  getPortabilityStats,
  type ExportFormat,
} from "../services/record-portability-store.js";

/* ================================================================== */
/* Init — portal session lookup injection (same pattern as portal-core) */
/* ================================================================== */

interface PortalSessionData {
  token: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

let portalSessionLookup: (request: FastifyRequest) => PortalSessionData | null;

export function initRecordPortability(
  sessionLookup: (request: FastifyRequest) => PortalSessionData | null
): void {
  portalSessionLookup = sessionLookup;
}

function requirePortalSession(
  request: FastifyRequest,
  reply: FastifyReply
): PortalSessionData {
  const session = portalSessionLookup?.(request);
  if (!session) {
    reply.code(401).send({ ok: false, error: "Not authenticated" });
    throw new Error("No portal session");
  }
  return session;
}

/* ================================================================== */
/* VistA Health Summary generation (VistA-first)                        */
/* ================================================================== */

const EXPORTABLE_SECTIONS = [
  "allergies", "problems", "vitals", "medications",
  "demographics", "immunizations", "labs",
];

interface SummaryResult {
  htmlContent: string;
  pdfBuffer: Buffer;
  sections: string[];
  rpcUsed: string[];
  pendingTargets: string[];
}

async function fetchSectionData(dfn: string, section: string): Promise<{
  data: unknown[];
  rpcUsed: string[];
  pendingTargets: string[];
}> {
  const rpcUsed: string[] = [];
  const pendingTargets: string[] = [];

  try {
    validateCredentials();
    await connect();
    let lines: string[];

    switch (section) {
      case "allergies":
        lines = await callRpc("ORQQAL LIST", [dfn]);
        rpcUsed.push("ORQQAL LIST");
        return {
          data: lines.map((l) => {
            const p = l.split("^");
            return p[0]?.trim() ? { id: p[0].trim(), allergen: p[1]?.trim() || "", severity: p[2]?.trim() || "" } : null;
          }).filter(Boolean),
          rpcUsed, pendingTargets,
        };

      case "problems":
        lines = await callRpc("ORWCH PROBLEM LIST", [dfn, "0"]);
        rpcUsed.push("ORWCH PROBLEM LIST");
        return {
          data: lines.map((l) => {
            const p = l.split("^");
            return p[0]?.trim() && p[1]?.trim() ? { id: p[0].trim(), text: p[1].trim(), status: p[2]?.trim() || "active" } : null;
          }).filter(Boolean),
          rpcUsed, pendingTargets,
        };

      case "vitals":
        lines = await callRpc("ORQQVI VITALS", [dfn, "3000101", "3991231"]);
        rpcUsed.push("ORQQVI VITALS");
        return {
          data: lines.map((l) => {
            const p = l.split("^");
            return p[0]?.trim() ? { type: p[1]?.trim() || "", value: p[2]?.trim() || "" } : null;
          }).filter(Boolean),
          rpcUsed, pendingTargets,
        };

      case "medications":
        lines = await callRpc("ORWPS ACTIVE", [dfn]);
        rpcUsed.push("ORWPS ACTIVE");
        const meds: { drugName: string; sig: string }[] = [];
        let cur: { drugName: string; sig: string } | null = null;
        for (const line of lines) {
          if (line.startsWith("~")) {
            if (cur) meds.push(cur);
            const p = line.substring(1).split("^");
            cur = { drugName: p[2]?.trim() || p[1]?.trim() || "Unknown", sig: "" };
          } else if (cur && (line.startsWith("\\") || line.startsWith(" "))) {
            const trimmed = line.replace(/^[\\ ]+/, "").trim();
            if (trimmed.toLowerCase().startsWith("sig:")) cur.sig = trimmed.substring(4).trim();
          }
        }
        if (cur) meds.push(cur);
        return { data: meds, rpcUsed, pendingTargets };

      case "demographics":
        lines = await callRpc("ORWPT SELECT", [dfn]);
        rpcUsed.push("ORWPT SELECT");
        const raw = lines[0] || "";
        const p = raw.split("^");
        if (p[0] === "-1" || !p[0]) return { data: [], rpcUsed, pendingTargets };
        return { data: [{ name: p[0], sex: p[1] || "", dob: p[2] || "" }], rpcUsed, pendingTargets };

      case "immunizations":
        // Integration-pending in WorldVistA sandbox
        pendingTargets.push("ORQQPX IMMUN LIST");
        return { data: [], rpcUsed, pendingTargets };

      case "labs":
        try {
          lines = await callRpc("ORWLRR INTERIMG", [dfn, "", "1", ""]);
          rpcUsed.push("ORWLRR INTERIMG");
          return {
            data: lines.map((l) => ({ text: l })).filter((l) => l.text.trim()),
            rpcUsed, pendingTargets,
          };
        } catch {
          pendingTargets.push("ORWLRR INTERIMG");
          return { data: [], rpcUsed, pendingTargets };
        }

      default:
        return { data: [], rpcUsed, pendingTargets };
    }
  } catch {
    return { data: [], rpcUsed, pendingTargets };
  } finally {
    try { disconnect(); } catch {}
  }
}

/**
 * Try VistA Health Summary (GMTS) first via ORWRP REPORT TEXT.
 * Falls back to section-by-section assembly.
 */
async function generatePatientSummary(
  dfn: string,
  patientName: string,
  sections: string[],
  format: ExportFormat
): Promise<SummaryResult> {
  const allRpcUsed: string[] = [];
  const allPendingTargets: string[] = [];
  const pdfSections: { heading: string; lines: string[] }[] = [];
  const htmlParts: string[] = [];

  // Attempt VistA Health Summary (ORWRP REPORT TEXT) first
  let hsText: string | null = null;
  try {
    validateCredentials();
    await connect();
    // Try to get abbreviated health summary
    const reportLines = await callRpc("ORWRP REPORT TEXT", [dfn, "1", "", "", "1", "0"]);
    allRpcUsed.push("ORWRP REPORT TEXT");
    hsText = reportLines.join("\n").trim();
    if (hsText.length < 20) hsText = null; // Too short = no real data
    disconnect();
  } catch {
    try { disconnect(); } catch {}
    // Will fall through to section-by-section
  }

  if (hsText) {
    pdfSections.push({ heading: "VistA Health Summary", lines: hsText.split("\n") });
    htmlParts.push(`<h2>VistA Health Summary</h2><pre>${escapeHtml(hsText)}</pre>`);
  }

  // Also fetch section-by-section data for completeness
  for (const sec of sections) {
    if (!EXPORTABLE_SECTIONS.includes(sec)) continue;
    const result = await fetchSectionData(dfn, sec);
    allRpcUsed.push(...result.rpcUsed);
    allPendingTargets.push(...result.pendingTargets);

    let formatted: { heading: string; lines: string[] } = { heading: sec, lines: ["No data available."] };
    switch (sec) {
      case "allergies": formatted = formatAllergiesForPdf(result.data as any[]); break;
      case "problems": formatted = formatProblemsForPdf(result.data as any[]); break;
      case "vitals": formatted = formatVitalsForPdf(result.data as any[]); break;
      case "medications": formatted = formatMedicationsForPdf(result.data as any[]); break;
      case "demographics": formatted = formatDemographicsForPdf(result.data as any[]); break;
      case "immunizations": formatted = formatImmunizationsForPdf(result.data as any[]); break;
      case "labs": formatted = formatLabsForPdf(result.data as any[]); break;
    }
    pdfSections.push(formatted);
    htmlParts.push(`<h2>${escapeHtml(formatted.heading)}</h2><pre>${formatted.lines.map(escapeHtml).join("\n")}</pre>`);
  }

  // Build output
  const title = `Patient Health Summary -- ${patientName}`;
  const pdfBuffer = Buffer.from(buildTextPdf(title, pdfSections));
  const htmlContent = buildHtmlDocument(title, htmlParts, allRpcUsed, allPendingTargets);

  return {
    htmlContent,
    pdfBuffer,
    sections,
    rpcUsed: [...new Set(allRpcUsed)],
    pendingTargets: [...new Set(allPendingTargets)],
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlDocument(
  title: string,
  bodyParts: string[],
  rpcUsed: string[],
  pendingTargets: string[]
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { border-bottom: 2px solid #007bff; padding-bottom: 8px; }
    h2 { color: #0056b3; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; margin-top: 24px; }
    pre { background: #f8f9fa; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-size: 13px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #dee2e6; font-size: 11px; color: #6c757d; }
    .rpc-info { font-size: 11px; color: #6c757d; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p style="color:#6c757d;font-size:13px;">Generated: ${new Date().toISOString()}</p>
  ${bodyParts.join("\n  ")}
  <div class="footer">
    <p><strong>Data Sources:</strong></p>
    <p class="rpc-info">RPCs used: ${rpcUsed.length > 0 ? rpcUsed.join(", ") : "none"}</p>
    ${pendingTargets.length > 0 ? `<p class="rpc-info">Integration pending: ${pendingTargets.join(", ")}</p>` : ""}
    <p>This document was generated from VistA electronic health records. It may not include all clinical information.</p>
  </div>
</body>
</html>`;
}

/* ================================================================== */
/* Route plugin                                                         */
/* ================================================================== */

export default async function recordPortabilityRoutes(
  server: FastifyInstance
): Promise<void> {

  /* ---------------------------------------------------------------- */
  /* POST /portal/record/export — generate summary, return token      */
  /* ---------------------------------------------------------------- */
  server.post("/portal/record/export", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const format: ExportFormat = body.format === "html" ? "html" : "pdf";
    const sections: string[] = Array.isArray(body.sections) && body.sections.length > 0
      ? body.sections.filter((s: string) => EXPORTABLE_SECTIONS.includes(s))
      : EXPORTABLE_SECTIONS;

    const summary = await generatePatientSummary(
      session.patientDfn,
      session.patientName,
      sections,
      format
    );

    const content = format === "html"
      ? Buffer.from(summary.htmlContent, "utf-8")
      : summary.pdfBuffer;

    const result = createExport({
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      format,
      content,
      sections: summary.sections,
      rpcUsed: summary.rpcUsed,
      pendingTargets: summary.pendingTargets,
    });

    if ("error" in result) {
      return reply.code(429).send({ ok: false, error: result.error });
    }

    return reply.send({
      ok: true,
      token: result.token,
      format: result.format,
      sections: result.sections,
      rpcUsed: result.rpcUsed,
      pendingTargets: result.pendingTargets,
      expiresAt: result.expiresAt,
    });
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/export/:token — download by token             */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/export/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const result = downloadExport(token);

    if ("error" in result) {
      return reply.code(result.status).send({ ok: false, error: result.error });
    }

    const ext = result.format === "html" ? "html" : "pdf";
    const mime = result.format === "html" ? "text/html" : "application/pdf";
    reply.header("Content-Type", mime);
    reply.header("Content-Disposition", `attachment; filename="health-summary-${Date.now()}.${ext}"`);
    return reply.send(result.content);
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/exports — list patient's exports              */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/exports", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const exports = getPatientExports(session.patientDfn);
    return reply.send({ ok: true, exports });
  });

  /* ---------------------------------------------------------------- */
  /* POST /portal/record/export/:token/revoke — revoke an export      */
  /* ---------------------------------------------------------------- */
  server.post("/portal/record/export/:token/revoke", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { token } = request.params as { token: string };
    const ok = revokeExport(token, session.patientDfn);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Export not found or already revoked." });
    }
    return reply.send({ ok: true, revokedAt: new Date().toISOString() });
  });

  /* ---------------------------------------------------------------- */
  /* POST /portal/record/share — create share link                    */
  /* ---------------------------------------------------------------- */
  server.post("/portal/record/share", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.exportToken) {
      return reply.code(400).send({ ok: false, error: "exportToken is required." });
    }

    const ttlMinutes = Math.max(1, Math.min(1440, Number(body.ttlMinutes) || 60));
    const label = String(body.label || "Shared health summary").slice(0, 200);
    const patientDob = String(body.patientDob || "");

    if (!patientDob) {
      return reply.code(400).send({ ok: false, error: "patientDob is required (YYYY-MM-DD)." });
    }

    const result = createRecordShare({
      exportToken: body.exportToken,
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      patientDob,
      label,
      sections: body.sections || EXPORTABLE_SECTIONS,
      ttlMs: ttlMinutes * 60 * 1000,
    });

    if ("error" in result) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    return reply.send({
      ok: true,
      shareId: result.id,
      shareToken: result.token,
      accessCode: result.accessCode,
      expiresAt: result.expiresAt,
      label: result.label,
      sections: result.sections,
    });
  });

  /* ---------------------------------------------------------------- */
  /* POST /portal/record/share/:id/revoke                             */
  /* ---------------------------------------------------------------- */
  server.post("/portal/record/share/:id/revoke", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const ok = revokeRecordShare(id, session.patientDfn);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Share not found or already revoked." });
    }
    return reply.send({ ok: true, revokedAt: new Date().toISOString() });
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/shares — list patient's share links           */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/shares", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const shares = getPatientShares(session.patientDfn).map((s) => ({
      id: s.id,
      token: s.token,
      label: s.label,
      sections: s.sections,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      accessCount: s.accessCount,
      locked: s.locked,
      lastAccessedAt: s.lastAccessedAt,
    }));
    return reply.send({ ok: true, shares });
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/share/audit — access audit for patient        */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/share/audit", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const events = getShareAudit(session.patientDfn);
    return reply.send({ ok: true, events });
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/share/preview/:token — public preview         */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/share/preview/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const preview = getSharePreview(token);
    if (!preview) {
      return reply.code(404).send({ ok: false, error: "Share not found or expired." });
    }
    return reply.send({ ok: true, ...preview });
  });

  /* ---------------------------------------------------------------- */
  /* POST /portal/record/share/verify/:token — verify + download      */
  /* ---------------------------------------------------------------- */
  server.post("/portal/record/share/verify/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = (request.body as any) || {};
    const accessCode = String(body.accessCode || "");
    const patientDob = String(body.patientDob || "");

    if (!accessCode || !patientDob) {
      return reply.code(400).send({ ok: false, error: "accessCode and patientDob are required." });
    }

    const result = verifyShareAccess(token, accessCode, patientDob, request.ip);

    if ("error" in result) {
      const status = result.retryable ? 403 : 410;
      return reply.code(status).send({ ok: false, error: result.error, retryable: result.retryable });
    }

    // Return the decrypted content directly
    const ext = result.format === "html" ? "html" : "pdf";
    const mime = result.format === "html" ? "text/html" : "application/pdf";
    reply.header("Content-Type", mime);
    reply.header("Content-Disposition", `inline; filename="shared-health-summary.${ext}"`);
    return reply.send(result.content);
  });

  /* ---------------------------------------------------------------- */
  /* GET /portal/record/stats                                         */
  /* ---------------------------------------------------------------- */
  server.get("/portal/record/stats", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    if (!session) return; // guard
    const stats = getPortabilityStats();
    return reply.send({ ok: true, ...stats });
  });
}
