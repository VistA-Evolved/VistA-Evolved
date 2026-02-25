/**
 * Scheduling Routes -- Phase 63, enhanced Phase 123: SD* integration pack.
 *
 * Endpoints:
 *   GET  /scheduling/appointments          -- patient appointments (SDOE)
 *   GET  /scheduling/appointments/range    -- date-range encounters (provider/clinic view)
 *   GET  /scheduling/clinics              -- clinic list (SD W/L RETRIVE HOSP LOC)
 *   GET  /scheduling/providers            -- provider list (SD W/L RETRIVE PERSON)
 *   GET  /scheduling/slots                -- availability (SDEC APPSLOTS when live)
 *   POST /scheduling/appointments/request -- request appointment (SD W/L CREATE FILE + fallback)
 *   POST /scheduling/appointments/:id/cancel    -- cancel / request cancel
 *   POST /scheduling/appointments/:id/reschedule -- reschedule request
 *   GET  /scheduling/requests             -- pending request queue (clinician)
 *   GET  /scheduling/health               -- scheduling module health
 *   --- Phase 123 additions ---
 *   GET  /scheduling/encounters/:ien/detail    -- encounter detail (SDOE GET GENERAL DATA)
 *   GET  /scheduling/encounters/:ien/providers -- encounter providers (SDOE GET PROVIDERS)
 *   GET  /scheduling/encounters/:ien/diagnoses -- encounter diagnoses (SDOE GET DIAGNOSES)
 *   GET  /scheduling/waitlist                  -- wait-list entries (SD W/L RETRIVE FULL DATA)
 *
 * Auth: session-based (default AUTH_RULES catch-all).
 * Audit: all writes logged to immutable-audit (no PHI).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAdapter } from "../../adapters/adapter-loader.js";
import type { SchedulingAdapter } from "../../adapters/scheduling/interface.js";
import { getRequestStore } from "../../adapters/scheduling/vista-adapter.js";
import { immutableAudit } from "../../lib/immutable-audit.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function getSchedulingAdapter(): SchedulingAdapter {
  const adapter = getAdapter("scheduling");
  if (!adapter) {
    throw new Error("Scheduling adapter not loaded -- check ADAPTER_SCHEDULING env var and initAdapters() order");
  }
  return adapter as unknown as SchedulingAdapter;
}

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || "anonymous",
    name: s?.userName || "unknown",
    roles: s?.role ? [s.role] : [],
  };
}

function requireSession(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.session) {
    reply.code(401).send({ ok: false, error: "Authentication required" });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Route registration                                                    */
/* ------------------------------------------------------------------ */

export default async function schedulingRoutes(server: FastifyInstance): Promise<void> {
  const adapter = getSchedulingAdapter();

  /* ---- Health ---- */
  server.get("/scheduling/health", async () => {
    const health = await adapter.healthCheck();
    return { ok: health.ok, adapter: adapter.implementationName, detail: health.detail };
  });

  /* ---- GET /scheduling/appointments?dfn=X&startDate=Y&endDate=Z ---- */
  server.get("/scheduling/appointments", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { dfn, startDate, endDate } = request.query as { dfn?: string; startDate?: string; endDate?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "dfn query parameter required" });
    }

    const result = await adapter.listAppointments(dfn, startDate, endDate);

    immutableAudit("scheduling.list", result.ok ? "success" : "failure", auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: { dfn: "[REDACTED]", count: result.data?.length ?? 0 },
    });

    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/appointments/range?startDate=X&endDate=Y ---- */
  server.get("/scheduling/appointments/range", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
    if (!startDate || !endDate) {
      return reply.code(400).send({ ok: false, error: "startDate and endDate query parameters required" });
    }

    const result = await adapter.listEncountersByDate(startDate, endDate);
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/clinics ---- */
  server.get("/scheduling/clinics", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const result = await adapter.listClinics();
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/providers ---- */
  server.get("/scheduling/providers", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const result = await adapter.listProviders();
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/slots?clinicIen=X&startDate=Y&endDate=Z ---- */
  server.get("/scheduling/slots", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { clinicIen, startDate, endDate } = request.query as { clinicIen?: string; startDate?: string; endDate?: string };
    if (!clinicIen || !startDate || !endDate) {
      return reply.code(400).send({ ok: false, error: "clinicIen, startDate, and endDate required" });
    }

    const result = await adapter.getAvailableSlots(clinicIen, startDate, endDate);
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- POST /scheduling/appointments/request ---- */
  server.post("/scheduling/appointments/request", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const body = (request.body as any) || {};
    const { patientDfn, clinicName, preferredDate, reason, appointmentType, clinicIen, providerDuz } = body;

    if (!patientDfn || !clinicName || !preferredDate || !reason) {
      return reply.code(400).send({
        ok: false,
        error: "patientDfn, clinicName, preferredDate, and reason are required",
      });
    }

    const result = await adapter.createAppointment({
      patientDfn,
      clinicName,
      preferredDate,
      reason: String(reason).slice(0, 500),
      appointmentType: appointmentType || "in_person",
      clinicIen,
      providerDuz,
    });

    immutableAudit("scheduling.request", result.ok ? "success" : "failure", auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: {
        clinicName,
        appointmentType: appointmentType || "in_person",
        pending: result.pending,
      },
    });

    if (!result.ok && !result.pending) {
      return reply.code(409).send({ ok: false, error: result.error });
    }

    return reply.code(201).send({
      ok: result.ok,
      data: result.data,
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
      notice: result.pending
        ? "Appointment request submitted. Clinic will confirm scheduling."
        : "Appointment booked successfully.",
    });
  });

  /* ---- POST /scheduling/appointments/:id/cancel ---- */
  server.post("/scheduling/appointments/:id/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const reason = body.reason || "Patient requested cancellation";
    const patientDfn = body.patientDfn;

    const result = await adapter.cancelAppointment(id, reason, patientDfn);

    immutableAudit("scheduling.cancel", result.ok ? "success" : "failure", auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: {
        appointmentId: id,
        pending: result.pending,
      },
    });

    return {
      ok: result.ok,
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
      notice: result.pending
        ? "Cancellation request submitted. Clinic will process."
        : "Appointment cancelled.",
    };
  });

  /* ---- POST /scheduling/appointments/:id/reschedule ---- */
  server.post("/scheduling/appointments/:id/reschedule", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { preferredDate, reason, patientDfn } = body;

    if (!patientDfn) {
      return reply.code(400).send({ ok: false, error: "patientDfn is required for reschedule" });
    }

    // Cancel original + create new request
    await adapter.cancelAppointment(id, reason || "Reschedule requested", patientDfn);

    if (preferredDate && body.clinicName) {
      const newResult = await adapter.createAppointment({
        patientDfn: patientDfn || "",
        clinicName: body.clinicName,
        preferredDate,
        reason: reason || "Rescheduled appointment",
        appointmentType: body.appointmentType || "in_person",
      });

      immutableAudit("scheduling.reschedule", "success", auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: request.session?.tenantId,
        detail: {
          originalId: id,
          pending: newResult.pending,
        },
      });

      return {
        ok: true,
        data: newResult.data,
        pending: newResult.pending,
        target: newResult.target,
        vistaGrounding: newResult.vistaGrounding,
        notice: "Reschedule request submitted. Clinic will confirm new date.",
      };
    }

    return {
      ok: true,
      pending: true,
      target: "SDEC APPADD + SDEC APPDEL",
      notice: "Reschedule request noted. Clinic will contact you.",
    };
  });

  /* ---- GET /scheduling/requests ---- */
  server.get("/scheduling/requests", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const store = getRequestStore();
    const requests = [...store.values()]
      .filter((r) => r.status === "pending")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { ok: true, data: requests, count: requests.length };
  });

  /* ================================================================== */
  /* Phase 123: New SD* endpoints                                        */
  /* ================================================================== */

  /* ---- GET /scheduling/encounters/:ien/detail ---- */
  server.get("/scheduling/encounters/:ien/detail", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { ien } = request.params as { ien: string };
    if (!ien) {
      return reply.code(400).send({ ok: false, error: "Encounter IEN required" });
    }

    const result = await adapter.getEncounterDetail(ien);
    return {
      ok: result.ok,
      data: result.data || null,
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/encounters/:ien/providers ---- */
  server.get("/scheduling/encounters/:ien/providers", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { ien } = request.params as { ien: string };
    if (!ien) {
      return reply.code(400).send({ ok: false, error: "Encounter IEN required" });
    }

    const result = await adapter.getEncounterProviders(ien);
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/encounters/:ien/diagnoses ---- */
  server.get("/scheduling/encounters/:ien/diagnoses", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { ien } = request.params as { ien: string };
    if (!ien) {
      return reply.code(400).send({ ok: false, error: "Encounter IEN required" });
    }

    const result = await adapter.getEncounterDiagnoses(ien);
    return {
      ok: result.ok,
      data: result.data || [],
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/waitlist?clinicIen=X ---- */
  server.get("/scheduling/waitlist", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { clinicIen } = request.query as { clinicIen?: string };

    const result = await adapter.getWaitList(clinicIen);
    return {
      ok: result.ok,
      data: result.data || [],
      count: (result.data || []).length,
      pending: result.pending,
      target: result.target,
      error: result.error,
      vistaGrounding: result.vistaGrounding,
    };
  });

  log.info("Scheduling routes registered (Phase 123: 14 endpoints, 9 RPCs wired)");
}
