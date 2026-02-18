/**
 * Portal Core Routes — Phase 27
 *
 * Registers all Phase 27 portal routes:
 *   - POST /portal/export/section/:section — PDF export per section
 *   - POST /portal/export/full — Full record bundle PDF
 *   - GET/POST /portal/messages — Inbox + compose
 *   - GET /portal/messages/drafts — Draft list
 *   - GET /portal/messages/sent — Sent list
 *   - GET/PUT/DELETE /portal/messages/:id — Single message ops
 *   - POST /portal/messages/:id/send — Send a draft
 *   - POST /portal/messages/:id/attachments — Add attachment
 *   - GET /portal/appointments — List upcoming+past
 *   - POST /portal/appointments/request — Request new appointment
 *   - POST /portal/appointments/:id/cancel — Request cancellation
 *   - POST /portal/appointments/:id/reschedule — Request reschedule
 *   - GET /portal/shares — List patient's shares
 *   - POST /portal/shares — Create share link
 *   - POST /portal/shares/:id/revoke — Revoke share
 *   - GET /portal/share/preview/:token — Public: share preview
 *   - POST /portal/share/verify/:token — Public: verify + access
 *   - GET/PUT /portal/settings — Read / update settings
 *   - POST /portal/proxy/grant — Grant proxy access
 *   - POST /portal/proxy/revoke — Revoke proxy access
 *   - GET /portal/proxy/list — List proxies for patient
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { log } from "../lib/logger.js";
import { portalAudit } from "../services/portal-audit.js";
import {
  buildTextPdf,
  formatAllergiesForPdf,
  formatProblemsForPdf,
  formatVitalsForPdf,
  formatMedicationsForPdf,
  formatDemographicsForPdf,
} from "../services/portal-pdf.js";
import {
  createDraft,
  sendMessage,
  addAttachment,
  getInbox,
  getDrafts,
  getSent,
  getThread,
  getMessage,
  updateDraft,
  deleteDraft,
  SLA_DISCLAIMER,
} from "../services/portal-messaging.js";
import {
  getUpcomingAppointments,
  getPastAppointments,
  getAppointment,
  requestAppointment,
  requestCancellation,
  requestReschedule,
} from "../services/portal-appointments.js";
import {
  createShareLink,
  getPatientShares,
  revokeShare,
  getSharePreview,
  verifyShareAccess,
} from "../services/portal-sharing.js";
import type { ShareableSection } from "../services/portal-sharing.js";
import {
  getSettings,
  updateSettings,
  LANGUAGE_OPTIONS,
} from "../services/portal-settings.js";
import {
  grantProxy,
  revokeProxy as revokeProxyAccess,
  getProxiesForPatient,
  evaluateSensitivity,
} from "../services/portal-sensitivity.js";

/* ------------------------------------------------------------------ */
/* Session import — reuse from portal-auth                              */
/* ------------------------------------------------------------------ */

// We import the requirePortalSession helper indirectly by reading the cookie
// and looking up the session. portal-auth.ts exports PortalSessionData.
// To avoid circular deps, we replicate the lightweight session lookup here.

interface PortalSessionData {
  token: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

// These are set by init() called from index.ts
let portalSessionLookup: (request: FastifyRequest) => PortalSessionData | null;

/** Called from index.ts to inject the session lookup without circular deps. */
export function initPortalCore(
  sessionLookup: (request: FastifyRequest) => PortalSessionData | null
) {
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

/* ------------------------------------------------------------------ */
/* VistA health data fetch helper (for PDF export)                      */
/* ------------------------------------------------------------------ */

import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";

async function fetchHealthData(dfn: string, resource: string): Promise<unknown[]> {
  try {
    validateCredentials();
    await connect();
    let lines: string[];

    switch (resource) {
      case "allergies":
        lines = await callRpc("ORQQAL LIST", [dfn]);
        return lines.map((l) => {
          const p = l.split("^");
          return p[0]?.trim() ? { id: p[0].trim(), allergen: p[1]?.trim() || "", severity: p[2]?.trim() || "", reactions: p[3]?.trim() || "" } : null;
        }).filter(Boolean) as unknown[];

      case "problems":
        lines = await callRpc("ORWCH PROBLEM LIST", [dfn, "0"]);
        return lines.map((l) => {
          const p = l.split("^");
          return p[0]?.trim() && p[1]?.trim() ? { id: p[0].trim(), text: p[1].trim(), status: p[2]?.trim() || "active", onset: p[3]?.trim() || "" } : null;
        }).filter(Boolean) as unknown[];

      case "vitals":
        lines = await callRpc("ORQQVI VITALS", [dfn, "3000101", "3991231"]);
        return lines.map((l) => {
          const p = l.split("^");
          return p[0]?.trim() ? { type: p[1]?.trim() || "", value: p[2]?.trim() || "", takenAt: p[3]?.trim() || "" } : null;
        }).filter(Boolean) as unknown[];

      case "medications":
        lines = await callRpc("ORWPS ACTIVE", [dfn]);
        const meds: { drugName: string; status: string; sig: string }[] = [];
        let cur: { drugName: string; status: string; sig: string } | null = null;
        for (const line of lines) {
          if (line.startsWith("~")) {
            if (cur) meds.push(cur);
            const p = line.substring(1).split("^");
            cur = { drugName: p[2]?.trim() || p[1]?.trim() || "Unknown", status: p[9]?.trim() || "", sig: "" };
          } else if (cur && (line.startsWith("\\") || line.startsWith(" "))) {
            const trimmed = line.replace(/^[\\ ]+/, "").trim();
            if (trimmed.toLowerCase().startsWith("sig:")) cur.sig = trimmed.substring(4).trim();
          }
        }
        if (cur) meds.push(cur);
        return meds as unknown[];

      case "demographics":
        lines = await callRpc("ORWPT SELECT", [dfn]);
        const raw = lines[0] || "";
        const p = raw.split("^");
        if (p[0] === "-1" || !p[0]) return [];
        return [{ name: p[0], sex: p[1] || "", dob: p[2] || "" }] as unknown[];

      default:
        return [];
    }
  } catch {
    return [];
  } finally {
    try { disconnect(); } catch {}
  }
}

/* ------------------------------------------------------------------ */
/* Route registration                                                   */
/* ------------------------------------------------------------------ */

export default async function portalCoreRoutes(
  server: FastifyInstance
): Promise<void> {

  /* ================================================================ */
  /* PDF Export                                                         */
  /* ================================================================ */

  const EXPORTABLE_SECTIONS = ["allergies", "problems", "vitals", "medications", "demographics"];

  server.get("/portal/export/section/:section", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { section } = request.params as { section: string };

    if (!EXPORTABLE_SECTIONS.includes(section)) {
      return reply.code(400).send({ ok: false, error: `Invalid section. Valid: ${EXPORTABLE_SECTIONS.join(", ")}` });
    }

    const data = await fetchHealthData(session.patientDfn, section);

    let sec_data: { heading: string; lines: string[] } = { heading: section, lines: ["No data available."] };
    switch (section) {
      case "allergies": sec_data = formatAllergiesForPdf(data as any[]); break;
      case "problems": sec_data = formatProblemsForPdf(data as any[]); break;
      case "vitals": sec_data = formatVitalsForPdf(data as any[]); break;
      case "medications": sec_data = formatMedicationsForPdf(data as any[]); break;
      case "demographics": sec_data = formatDemographicsForPdf(data as any[]); break;
    }

    const title = `${section.charAt(0).toUpperCase() + section.slice(1)} — ${session.patientName}`;
    const pdf = buildTextPdf(title, [sec_data]);

    portalAudit("portal.export.section", "success", session.patientDfn, {
      sourceIp: request.ip,
      detail: { section, records: data.length },
    });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="${section}-${Date.now()}.pdf"`);
    return reply.send(Buffer.from(pdf));
  });

  server.get("/portal/export/full", async (request, reply) => {
    const session = requirePortalSession(request, reply);

    const sections: { heading: string; lines: string[] }[] = [];

    for (const sec of EXPORTABLE_SECTIONS) {
      const data = await fetchHealthData(session.patientDfn, sec);
      let sec_data: { heading: string; lines: string[] } = { heading: sec, lines: ["No data available."] };
      switch (sec) {
        case "allergies": sec_data = formatAllergiesForPdf(data as any[]); break;
        case "problems": sec_data = formatProblemsForPdf(data as any[]); break;
        case "vitals": sec_data = formatVitalsForPdf(data as any[]); break;
        case "medications": sec_data = formatMedicationsForPdf(data as any[]); break;
        case "demographics": sec_data = formatDemographicsForPdf(data as any[]); break;
      }
      sections.push(sec_data);
    }

    const title = `Health Record — ${session.patientName}`;
    const pdf = buildTextPdf(title, sections);

    portalAudit("portal.export.full", "success", session.patientDfn, {
      sourceIp: request.ip,
      detail: { sections: EXPORTABLE_SECTIONS },
    });

    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `attachment; filename="health-record-${Date.now()}.pdf"`);
    return reply.send(Buffer.from(pdf));
  });

  /* ================================================================ */
  /* Secure Messaging                                                   */
  /* ================================================================ */

  server.get("/portal/messages", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const inbox = getInbox(session.patientDfn);
    return reply.send({ ok: true, messages: inbox, slaDisclaimer: SLA_DISCLAIMER });
  });

  server.get("/portal/messages/drafts", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return reply.send({ ok: true, messages: getDrafts(session.patientDfn) });
  });

  server.get("/portal/messages/sent", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return reply.send({ ok: true, messages: getSent(session.patientDfn) });
  });

  server.get("/portal/messages/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const msg = getMessage(id, session.patientDfn);
    if (!msg) return reply.code(404).send({ ok: false, error: "Message not found" });

    portalAudit("portal.message.read", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { messageId: id },
    });
    return reply.send({ ok: true, message: msg });
  });

  server.get("/portal/messages/:id/thread", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const msg = getMessage(id, session.patientDfn);
    if (!msg) return reply.code(404).send({ ok: false, error: "Message not found" });
    const thread = getThread(msg.threadId);
    return reply.send({ ok: true, messages: thread });
  });

  server.post("/portal/messages", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const draft = createDraft({
      fromDfn: session.patientDfn,
      fromName: session.patientName,
      subject: body.subject || "",
      category: body.category || "general",
      body: body.body || "",
      replyToId: body.replyToId || undefined,
    });

    portalAudit("portal.message.draft", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { messageId: draft.id },
    });

    return reply.code(201).send({ ok: true, message: draft });
  });

  server.put("/portal/messages/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const result = updateDraft(id, session.patientDfn, body);
    if (!result) return reply.code(404).send({ ok: false, error: "Draft not found or already sent" });
    return reply.send({ ok: true, message: result });
  });

  server.delete("/portal/messages/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteDraft(id, session.patientDfn)) {
      return reply.code(404).send({ ok: false, error: "Draft not found" });
    }
    return reply.send({ ok: true });
  });

  server.post("/portal/messages/:id/send", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const result = sendMessage(id, session.patientDfn);
    if (!result) return reply.code(400).send({ ok: false, error: "Draft not found or already sent" });

    portalAudit("portal.message.send", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { messageId: id },
    });
    return reply.send({ ok: true, message: result, slaDisclaimer: SLA_DISCLAIMER });
  });

  server.post("/portal/messages/:id/attachments", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const result = addAttachment(id, session.patientDfn, {
      filename: body.filename || "untitled",
      mimeType: body.mimeType || "application/pdf",
      data: body.data || "",
    });
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return reply.send({ ok: true, attachment: result });
  });

  /* ================================================================ */
  /* Appointments                                                       */
  /* ================================================================ */

  server.get("/portal/appointments", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const upcoming = getUpcomingAppointments(session.patientDfn);
    const past = getPastAppointments(session.patientDfn);

    portalAudit("portal.appointment.view", "success", session.patientDfn, {
      sourceIp: request.ip,
    });

    return reply.send({
      ok: true,
      upcoming,
      past,
      _note: "Scheduling RPCs (SD APPOINTMENT LIST) not available in sandbox. Demo data shown.",
    });
  });

  server.get("/portal/appointments/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const appt = getAppointment(id, session.patientDfn);
    if (!appt) return reply.code(404).send({ ok: false, error: "Appointment not found" });
    return reply.send({ ok: true, appointment: appt });
  });

  server.post("/portal/appointments/request", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.clinicName || !body.preferredDate || !body.reason) {
      return reply.code(400).send({ ok: false, error: "clinicName, preferredDate, and reason are required" });
    }

    const appt = requestAppointment({
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      clinicName: body.clinicName,
      appointmentType: body.appointmentType || "in_person",
      preferredDate: body.preferredDate,
      reason: body.reason,
    });

    return reply.code(201).send({
      ok: true,
      appointment: appt,
      notice: "Your request has been submitted. The clinic will contact you to confirm.",
    });
  });

  server.post("/portal/appointments/:id/cancel", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const result = requestCancellation(id, session.patientDfn, body.reason || "Patient requested cancellation");
    if (!result) return reply.code(404).send({ ok: false, error: "Appointment not found or cannot be cancelled" });

    return reply.send({
      ok: true,
      appointment: result,
      notice: "Cancellation request submitted. The clinic will confirm.",
    });
  });

  server.post("/portal/appointments/:id/reschedule", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const result = requestReschedule(id, session.patientDfn, body.preference || "");
    if (!result) return reply.code(404).send({ ok: false, error: "Appointment not found or cannot be rescheduled" });

    return reply.send({
      ok: true,
      appointment: result,
      notice: "Reschedule request submitted. The clinic will contact you with available times.",
    });
  });

  /* ================================================================ */
  /* Sharing                                                            */
  /* ================================================================ */

  server.get("/portal/shares", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const shares = getPatientShares(session.patientDfn);
    // Strip access codes from the list response (only shown at creation)
    const safe = shares.map(({ accessCode, ...rest }) => rest);
    return reply.send({ ok: true, shares: safe });
  });

  server.post("/portal/shares", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return reply.code(400).send({ ok: false, error: "sections array is required" });
    }

    // Need patient DOB for verification — fetch from VistA or use placeholder
    let dob = body.patientDob || "";
    if (!dob) {
      try {
        const demoData = await fetchHealthData(session.patientDfn, "demographics");
        if (demoData.length > 0) dob = (demoData[0] as any).dob || "";
      } catch {}
    }

    const result = createShareLink({
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      patientDob: dob,
      sections: body.sections as ShareableSection[],
      label: body.label || "Shared record",
      ttlMs: body.ttlHours ? body.ttlHours * 60 * 60 * 1000 : undefined,
    });

    if ("error" in result) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    // Return access code ONLY at creation time — never again
    return reply.code(201).send({
      ok: true,
      share: result,
      notice: "Save the access code now — it will not be shown again.",
    });
  });

  server.post("/portal/shares/:id/revoke", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    if (!revokeShare(id, session.patientDfn)) {
      return reply.code(404).send({ ok: false, error: "Share not found or already revoked" });
    }
    return reply.send({ ok: true });
  });

  // ─── Public share routes (no session required) ───

  server.get("/portal/share/preview/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const preview = getSharePreview(token);
    if (!preview) return reply.code(404).send({ ok: false, error: "Share not found or expired" });
    return reply.send({ ok: true, preview });
  });

  server.post("/portal/share/verify/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const body = (request.body as any) || {};

    if (!body.accessCode || !body.patientDob) {
      return reply.code(400).send({ ok: false, error: "accessCode and patientDob are required" });
    }

    const ip = (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || request.ip;
    const result = verifyShareAccess(token, body.accessCode, body.patientDob, ip);

    if ("error" in result) {
      const status = result.retryable ? 403 : 410;
      return reply.code(status).send({ ok: false, error: result.error, retryable: result.retryable });
    }

    // Fetch only the allowed sections
    const sectionData: Record<string, unknown[]> = {};
    for (const sec of result.sections) {
      sectionData[sec] = await fetchHealthData(result.patientDfn, sec);
    }

    return reply.send({
      ok: true,
      patientName: result.patientName,
      sections: result.sections,
      data: sectionData,
      expiresAt: result.expiresAt,
    });
  });

  /* ================================================================ */
  /* Settings                                                           */
  /* ================================================================ */

  server.get("/portal/settings", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const settings = getSettings(session.patientDfn);
    return reply.send({ ok: true, settings, languages: LANGUAGE_OPTIONS });
  });

  server.put("/portal/settings", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const result = updateSettings(session.patientDfn, body);
    if ("error" in result) return reply.code(400).send({ ok: false, error: result.error });
    return reply.send({ ok: true, settings: result });
  });

  /* ================================================================ */
  /* Proxy Access                                                       */
  /* ================================================================ */

  server.get("/portal/proxy/list", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const proxies = getProxiesForPatient(session.patientDfn);
    return reply.send({ ok: true, proxies });
  });

  server.post("/portal/proxy/grant", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.proxyDfn || !body.proxyName || !body.relationship) {
      return reply.code(400).send({ ok: false, error: "proxyDfn, proxyName, and relationship are required" });
    }

    const proxy = grantProxy(
      session.patientDfn,
      body.proxyDfn,
      body.proxyName,
      body.relationship,
      body.accessLevel || "read_only",
    );

    return reply.code(201).send({ ok: true, proxy });
  });

  server.post("/portal/proxy/revoke", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.proxyId) {
      return reply.code(400).send({ ok: false, error: "proxyId is required" });
    }

    if (!revokeProxyAccess(body.proxyId, session.patientDfn)) {
      return reply.code(404).send({ ok: false, error: "Proxy relationship not found" });
    }
    return reply.send({ ok: true });
  });

  server.post("/portal/proxy/evaluate", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    const filters = evaluateSensitivity({
      patientAge: body.patientAge || 30,
      isProxy: body.isProxy || false,
      isMinor: body.isMinor || false,
      dataCategories: body.dataCategories || [],
      jurisdiction: body.jurisdiction || undefined,
    });

    return reply.send({ ok: true, filters });
  });

  log.info("Portal core routes registered (Phase 27)");
}
