/**
 * Portal Core Routes — Phase 27 → Phase 32 enhancements
 *
 * Registers all Phase 27+ portal routes:
 *   - POST /portal/export/section/:section — PDF export per section
 *   - POST /portal/export/full — Full record bundle PDF
 *   - GET  /portal/export/json — Structured JSON export (Phase 31)
 *   - GET  /portal/export/shc/:dataset — SMART Health Card (Phase 31)
 *   - GET  /portal/shc/capabilities — SHC feature status (Phase 31)
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
 *   Phase 32:
 *   - GET /portal/refills — Patient refill requests
 *   - POST /portal/refills — Submit refill request
 *   - POST /portal/refills/:id/cancel — Cancel refill request
 *   - GET /portal/tasks — Patient tasks/notifications
 *   - GET /portal/tasks/counts — Badge counts by category
 *   - POST /portal/tasks/:id/dismiss — Dismiss a task
 *   - POST /portal/tasks/:id/complete — Complete a task
 *   - GET /portal/staff/refills — Staff refill queue
 *   - POST /portal/staff/refills/:id/review — Approve/deny refill
 *   - GET /portal/staff/tasks — Staff task queue
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
  formatImmunizationsForPdf,
  formatLabsForPdf,
  buildStructuredJsonExport,
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
  generateShcCredential,
  getShcCapabilities,
} from "../services/portal-shc.js";
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
import {
  getPatientRefills,
  requestRefill,
  cancelRefill,
  getStaffRefillQueue,
  reviewRefill,
} from "../services/portal-refills.js";
import {
  getPatientTasks,
  getPatientTaskCounts,
  getStaffTaskQueue,
  dismissTask,
  completeTask,
} from "../services/portal-tasks.js";
import {
  getStaffMessageQueue,
  clinicianReply,
} from "../services/portal-messaging.js";

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
    // BUG-068: reply.send() + throw causes ERR_HTTP_HEADERS_SENT crash.
    // Throw a Fastify-aware error with statusCode -- Fastify sends the response.
    const err: any = new Error("Not authenticated");
    err.statusCode = 401;
    throw err;
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

  const EXPORTABLE_SECTIONS = ["allergies", "problems", "vitals", "medications", "demographics", "immunizations", "labs"];

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
      case "immunizations": sec_data = formatImmunizationsForPdf(data as any[]); break;
      case "labs": sec_data = formatLabsForPdf(data as any[]); break;
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
        case "immunizations": sec_data = formatImmunizationsForPdf(data as any[]); break;
        case "labs": sec_data = formatLabsForPdf(data as any[]); break;
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
  /* Phase 31: Structured JSON Export                                   */
  /* ================================================================ */

  server.get("/portal/export/json", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const query = request.query as { sections?: string };
    const requestedSections = query.sections
      ? query.sections.split(",").filter(s => EXPORTABLE_SECTIONS.includes(s.trim()))
      : EXPORTABLE_SECTIONS;

    const sectionData: Record<string, unknown[]> = {};
    for (const sec of requestedSections) {
      sectionData[sec] = await fetchHealthData(session.patientDfn, sec);
    }

    const jsonExport = buildStructuredJsonExport(session.patientName, sectionData);

    portalAudit("portal.export.json", "success", session.patientDfn, {
      sourceIp: request.ip,
      detail: { sections: requestedSections, totalRecords: jsonExport.metadata.totalRecords },
    });

    reply.header("Content-Type", "application/json");
    reply.header("Content-Disposition", `attachment; filename="health-record-${Date.now()}.json"`);
    return reply.send(jsonExport);
  });

  /* ================================================================ */
  /* Phase 31: SMART Health Cards (SHC)                                 */
  /* ================================================================ */

  server.get("/portal/shc/capabilities", async (request, reply) => {
    return reply.send({ ok: true, ...getShcCapabilities() });
  });

  server.get("/portal/export/shc/:dataset", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { dataset } = request.params as { dataset: string };

    const data = await fetchHealthData(session.patientDfn, dataset);
    const result = generateShcCredential(dataset as any, session.patientName, data as any[]);

    if ("error" in result) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    portalAudit("portal.export.shc", "success", session.patientDfn, {
      sourceIp: request.ip,
      detail: { dataset, recordCount: result.meta.recordCount, devMode: result.meta.devMode },
    });

    return reply.send({ ok: true, credential: result });
  });

  /* ================================================================ */
  /* Secure Messaging                                                   */
  /* ================================================================ */

  server.get("/portal/messages", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const inbox = await getInbox(session.patientDfn);
    return reply.send({ ok: true, messages: inbox, slaDisclaimer: SLA_DISCLAIMER });
  });

  server.get("/portal/messages/drafts", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return reply.send({ ok: true, messages: await getDrafts(session.patientDfn) });
  });

  server.get("/portal/messages/sent", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    return reply.send({ ok: true, messages: await getSent(session.patientDfn) });
  });

  server.get("/portal/messages/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const msg = await getMessage(id, session.patientDfn);
    if (!msg) return reply.code(404).send({ ok: false, error: "Message not found" });

    portalAudit("portal.message.read", "success", session.patientDfn, {
      sourceIp: request.ip, detail: { messageId: id },
    });
    return reply.send({ ok: true, message: msg });
  });

  server.get("/portal/messages/:id/thread", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const msg = await getMessage(id, session.patientDfn);
    if (!msg) return reply.code(404).send({ ok: false, error: "Message not found" });
    const thread = await getThread(msg.threadId);
    return reply.send({ ok: true, messages: thread });
  });

  server.post("/portal/messages", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const draft = await createDraft({
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
    const result = await updateDraft(id, session.patientDfn, body);
    if (!result) return reply.code(404).send({ ok: false, error: "Draft not found or already sent" });
    return reply.send({ ok: true, message: result });
  });

  server.delete("/portal/messages/:id", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    if (!(await deleteDraft(id, session.patientDfn))) {
      return reply.code(404).send({ ok: false, error: "Draft not found" });
    }
    return reply.send({ ok: true, deleted: id });
  });

  server.post("/portal/messages/:id/send", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const result = await sendMessage(id, session.patientDfn);
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
    const result = await addAttachment(id, session.patientDfn, {
      filename: body.filename || "untitled",
      mimeType: body.mimeType || "application/pdf",
      data: body.data || "",
    });
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return reply.send({ ok: true, attachment: result });
  });

  /* ================================================================ */
  /* Appointments — Phase 63: wired to scheduling adapter               */
  /* ================================================================ */

  server.get("/portal/appointments", async (request, reply) => {
    const session = requirePortalSession(request, reply);

    // Try VistA scheduling adapter first for real encounter data
    let vistaAppointments: any[] = [];
    let vistaNote = "";
    try {
      const { getAdapter } = await import("../adapters/adapter-loader.js");
      const adapter = getAdapter("scheduling") as any;
      if (adapter && typeof adapter.listAppointments === "function") {
        const result = await adapter.listAppointments(session.patientDfn);
        if (result.ok && result.data) {
          vistaAppointments = result.data;
        }
        if (result.pending) {
          vistaNote = `VistA scheduling: ${result.target || "pending"}`;
        }
      }
    } catch { /* VistA unavailable — fall back to local store */ }

    // Also include local portal appointments (legacy Phase 27 store)
    const upcoming = getUpcomingAppointments(session.patientDfn);
    const past = getPastAppointments(session.patientDfn);

    // Normalize VistA encounters → portal shape (scheduledAt, clinicName, etc.)
    const normalizeVista = (a: any) => ({
      ...a,
      scheduledAt: a.scheduledAt || a.dateTime,
      clinicName:  a.clinicName  || a.clinic,
      providerName: a.providerName || a.provider,
      duration: a.duration || 30,
      appointmentType: a.appointmentType || 'in_person',
      reason: a.reason || '',
    });

    // Merge: VistA encounters + local requests (deduplicated by ID)
    const seenIds = new Set<string>();
    const allUpcoming: any[] = [];
    const allPast: any[] = [];
    const now = new Date().toISOString();

    for (const raw of vistaAppointments) {
      const a = normalizeVista(raw);
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        if (a.scheduledAt >= now) allUpcoming.push(a);
        else allPast.push(a);
      }
    }
    for (const a of upcoming) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allUpcoming.push(a);
      }
    }
    for (const a of past) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allPast.push(a);
      }
    }

    portalAudit("portal.appointment.view", "success", session.patientDfn, {
      sourceIp: request.ip,
    });

    return reply.send({
      ok: true,
      upcoming: allUpcoming,
      past: allPast,
      _note: vistaNote || undefined,
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

    // Try scheduling adapter first (Phase 63) so request appears in queue
    try {
      const { getAdapter } = await import("../adapters/adapter-loader.js");
      const adapter = getAdapter("scheduling") as any;
      if (adapter && typeof adapter.createAppointment === "function") {
        const result = await adapter.createAppointment({
          patientDfn: session.patientDfn,
          clinicName: body.clinicName,
          preferredDate: body.preferredDate,
          reason: body.reason,
          appointmentType: body.appointmentType || "in_person",
        });

        // Also store in legacy store for portal compatibility
        requestAppointment({
          patientDfn: session.patientDfn,
          patientName: session.patientName,
          clinicName: body.clinicName,
          appointmentType: body.appointmentType || "in_person",
          preferredDate: body.preferredDate,
          reason: body.reason,
        });

        return reply.code(201).send({
          ok: true,
          appointment: result.data,
          pending: result.pending,
          target: result.target,
          notice: "Your request has been submitted. The clinic will contact you to confirm.",
        });
      }
    } catch { /* scheduling adapter unavailable -- fall through to legacy */ }

    // Legacy fallback
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
    const reason = body.reason || "Patient requested cancellation";

    // Try scheduling adapter first (Phase 63) for VistA encounter cancellation
    try {
      const { getAdapter } = await import("../adapters/adapter-loader.js");
      const adapter = getAdapter("scheduling") as any;
      if (adapter && typeof adapter.cancelAppointment === "function") {
        const adapterResult = await adapter.cancelAppointment(id, reason, session.patientDfn);
        if (adapterResult.ok || adapterResult.pending) {
          return reply.send({
            ok: true,
            pending: adapterResult.pending,
            target: adapterResult.target,
            notice: adapterResult.pending
              ? "Cancellation request submitted. The clinic will confirm."
              : "Appointment cancelled.",
          });
        }
      }
    } catch { /* scheduling adapter unavailable -- fall through */ }

    // Legacy fallback
    const result = requestCancellation(id, session.patientDfn, reason);
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

    // Try scheduling adapter first (Phase 63)
    try {
      const { getAdapter } = await import("../adapters/adapter-loader.js");
      const adapter = getAdapter("scheduling") as any;
      if (adapter && typeof adapter.cancelAppointment === "function") {
        // Cancel original via adapter
        await adapter.cancelAppointment(id, body.reason || "Reschedule requested", session.patientDfn);

        // Create new request if preferred date given
        if (body.preference || body.preferredDate) {
          const newResult = await adapter.createAppointment({
            patientDfn: session.patientDfn,
            clinicName: body.clinicName || "Rescheduled",
            preferredDate: body.preferredDate || body.preference || "",
            reason: body.reason || "Rescheduled appointment",
          });
          return reply.send({
            ok: true,
            data: newResult.data,
            pending: newResult.pending,
            target: newResult.target,
            notice: "Reschedule request submitted. The clinic will contact you with available times.",
          });
        }

        return reply.send({
          ok: true,
          pending: true,
          target: "SDEC APPADD + SDEC APPDEL",
          notice: "Reschedule request submitted. The clinic will contact you with available times.",
        });
      }
    } catch { /* scheduling adapter unavailable -- fall through */ }

    // Legacy fallback
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
      } catch {
        // DOB fetch failed — proceed with empty DOB (non-critical for share link)
      }
    }

    const result = createShareLink({
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      patientDob: dob,
      sections: body.sections as ShareableSection[],
      label: body.label || "Shared record",
      ttlMs: body.ttlMinutes ? body.ttlMinutes * 60 * 1000
           : body.ttlHours ? body.ttlHours * 60 * 60 * 1000
           : undefined,
      oneTimeRedeem: body.oneTimeRedeem ?? false,
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
    return reply.send({ ok: true, deleted: id });
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
    const result = verifyShareAccess(token, body.accessCode, body.patientDob, ip, body.captchaToken);

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
    return reply.send({ ok: true, deleted: body.proxyId });
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

  /* ================================================================ */
  /* Refill Requests (Phase 32)                                         */
  /* ================================================================ */

  server.get("/portal/refills", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const refills = getPatientRefills(session.patientDfn);
    return reply.send({ ok: true, refills });
  });

  server.post("/portal/refills", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};

    if (!body.medicationName || !body.medicationId) {
      return reply.code(400).send({ ok: false, error: "medicationName and medicationId are required" });
    }

    const result = requestRefill({
      patientDfn: session.patientDfn,
      patientName: session.patientName,
      medicationName: body.medicationName,
      medicationId: body.medicationId,
      submittedBy: session.patientDfn,
      submittedByName: session.patientName,
      isProxy: false,
    });

    if ("error" in result) {
      return reply.code(429).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, refill: result });
  });

  server.post("/portal/refills/:id/cancel", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };

    const cancelled = cancelRefill(id, session.patientDfn);
    if (!cancelled) {
      return reply.code(404).send({ ok: false, error: "Refill request not found or cannot be cancelled" });
    }
    return reply.send({ ok: true, refill: cancelled });
  });

  /* ================================================================ */
  /* Tasks & Notifications (Phase 32)                                   */
  /* ================================================================ */

  server.get("/portal/tasks", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const query = (request.query as any) || {};

    const statusFilter = query.status ? query.status.split(",") : undefined;
    const categoryFilter = query.category ? query.category.split(",") : undefined;

    const tasks = getPatientTasks(session.patientDfn, { statusFilter, categoryFilter });
    return reply.send({ ok: true, tasks });
  });

  server.get("/portal/tasks/counts", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const counts = getPatientTaskCounts(session.patientDfn);
    return reply.send({ ok: true, ...counts });
  });

  server.post("/portal/tasks/:id/dismiss", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };

    const dismissed = dismissTask(id, session.patientDfn);
    if (!dismissed) {
      return reply.code(404).send({ ok: false, error: "Task not found or already resolved" });
    }
    return reply.send({ ok: true, task: dismissed });
  });

  server.post("/portal/tasks/:id/complete", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };

    const completed = completeTask(id, session.patientDfn);
    if (!completed) {
      return reply.code(404).send({ ok: false, error: "Task not found or already resolved" });
    }
    return reply.send({ ok: true, task: completed });
  });

  /* ================================================================ */
  /* Staff Routes (Phase 32)                                            */
  /* ================================================================ */

  server.get("/portal/staff/refills", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    // In production: check staff role. For now, any authenticated portal user can view.
    const queue = getStaffRefillQueue();
    return reply.send({ ok: true, refills: queue });
  });

  server.post("/portal/staff/refills/:id/review", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    if (!body.action || !["approve", "deny"].includes(body.action)) {
      return reply.code(400).send({ ok: false, error: "action must be 'approve' or 'deny'" });
    }

    const result = reviewRefill(
      id,
      body.action,
      session.patientDfn,   // Using session DFN as clinician ID in sandbox
      session.patientName,
      body.note || "",
    );

    if ("error" in result) {
      return reply.code(404).send({ ok: false, error: result.error });
    }
    return reply.send({ ok: true, refill: result });
  });

  server.get("/portal/staff/tasks", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const query = (request.query as any) || {};
    const categoryFilter = query.category ? query.category.split(",") : undefined;

    const tasks = getStaffTaskQueue({ categoryFilter });
    return reply.send({ ok: true, tasks });
  });

  server.get("/portal/staff/messages", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const queue = await getStaffMessageQueue();
    return reply.send({ ok: true, messages: queue });
  });

  server.post("/portal/staff/messages/:id/reply", async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    if (!body.body) {
      return reply.code(400).send({ ok: false, error: "body is required" });
    }

    const result = await clinicianReply({
      replyToId: id,
      clinicianDuz: session.patientDfn,   // clinician DUZ in sandbox
      clinicianName: session.patientName,  // clinician name
      body: body.body,
    });

    if (!result || "error" in result) {
      return reply.code(404).send({ ok: false, error: (result && "error" in result) ? result.error : "Message not found or not a patient message" });
    }
    return reply.send({ ok: true, message: result });
  });

  log.info("Portal core routes registered (Phase 27 → Phase 32)");
}
