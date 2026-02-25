/**
 * Scheduling Routes -- Phase 63, enhanced Phase 123: SD* integration pack,
 * Phase 131: lifecycle depth + CPRS appointments + reference data + posture.
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
 *   --- Phase 131 additions ---
 *   GET  /scheduling/appointments/cprs         -- CPRS appointment list (ORWPT APPTLST)
 *   GET  /scheduling/reference-data            -- SD W/L PRIORITY/TYPE/STATUS
 *   GET  /scheduling/posture                   -- RPC inventory posture
 *   GET  /scheduling/lifecycle                 -- lifecycle tracking entries
 *   POST /scheduling/lifecycle/transition      -- record lifecycle state change
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
    const store = await getRequestStore();
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

  /* ================================================================== */
  /* Phase 131: Lifecycle depth, CPRS appointments, reference, posture   */
  /* ================================================================== */

  /* ---- GET /scheduling/appointments/cprs?dfn=X ---- */
  server.get("/scheduling/appointments/cprs", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "dfn query parameter required" });
    }

    const result = await adapter.getAppointmentsCprs(dfn);

    immutableAudit("scheduling.cprs_apptlist", result.ok ? "success" : "failure", auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: { dfn: "[REDACTED]", count: result.data?.length ?? 0 },
    });

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

  /* ---- GET /scheduling/reference-data ---- */
  server.get("/scheduling/reference-data", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;

    const result = await adapter.getReferenceData();
    return {
      ok: result.ok,
      data: result.data || { priorities: [], types: [], statuses: [] },
      pending: result.pending,
      target: result.target,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/posture ---- */
  server.get("/scheduling/posture", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;

    const result = await adapter.getRpcPosture();
    const entries = result.data || [];
    const summary = {
      available: entries.filter((e) => e.status === "available").length,
      callableNoData: entries.filter((e) => e.status === "callable_no_data").length,
      notInstalled: entries.filter((e) => e.status === "not_installed").length,
      total: entries.length,
    };

    return {
      ok: result.ok,
      data: entries,
      summary,
      vistaGrounding: result.vistaGrounding,
    };
  });

  /* ---- GET /scheduling/lifecycle?patientDfn=X&appointmentRef=Y&state=Z ---- */
  server.get("/scheduling/lifecycle", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { patientDfn, appointmentRef, state, limit } = request.query as {
      patientDfn?: string;
      appointmentRef?: string;
      state?: string;
      limit?: string;
    };

    try {
      const pgLifecycleRepo = await import("../../platform/pg/repo/pg-scheduling-lifecycle-repo.js");

      let entries;
      if (appointmentRef) {
        entries = await pgLifecycleRepo.findLifecycleByAppointmentRef(appointmentRef);
      } else if (patientDfn) {
        entries = await pgLifecycleRepo.findLifecycleByPatient(patientDfn, parseInt(limit || "50", 10));
      } else if (state) {
        entries = await pgLifecycleRepo.findLifecycleByState(state, parseInt(limit || "100", 10));
      } else {
        // Return stats summary when no filter
        const counts = await pgLifecycleRepo.countByState();
        const total = await pgLifecycleRepo.countTotal();
        return { ok: true, data: [], stats: { total, byState: counts } };
      }

      return {
        ok: true,
        data: entries || [],
        count: (entries || []).length,
      };
    } catch (err: any) {
      log.warn("Lifecycle query failed", { error: err.message });
      return {
        ok: false,
        data: [],
        error: `Lifecycle query failed: ${err.message}`,
        pending: true,
        target: "PG scheduling_lifecycle table (requires PLATFORM_PG_URL)",
      };
    }
  });

  /* ---- POST /scheduling/lifecycle/transition ---- */
  server.post("/scheduling/lifecycle/transition", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const body = (request.body as any) || {};
    const { appointmentRef, patientDfn, clinicName, clinicIen, state, vistaIen, rpcUsed, note } = body;

    if (!appointmentRef || !patientDfn || !clinicName || !state) {
      return reply.code(400).send({
        ok: false,
        error: "appointmentRef, patientDfn, clinicName, and state are required",
      });
    }

    try {
      const pgLifecycleRepo = await import("../../platform/pg/repo/pg-scheduling-lifecycle-repo.js");
      const { randomUUID } = await import("node:crypto");

      // Validate state
      if (!pgLifecycleRepo.LIFECYCLE_STATES.includes(state)) {
        return reply.code(400).send({
          ok: false,
          error: `Invalid state: ${state}. Valid states: ${pgLifecycleRepo.LIFECYCLE_STATES.join(", ")}`,
        });
      }

      // Check previous state for transition validation
      const latest = await pgLifecycleRepo.findLatestByAppointmentRef(appointmentRef);
      const previousState = latest?.state;

      if (previousState && !pgLifecycleRepo.isValidTransition(previousState, state)) {
        return reply.code(409).send({
          ok: false,
          error: `Invalid transition: ${previousState} -> ${state}`,
          currentState: previousState,
          validTransitions: ["requested", "waitlisted", "booked", "checked_in", "completed", "cancelled", "no_show"]
            .filter((s) => pgLifecycleRepo.isValidTransition(previousState, s)),
        });
      }

      const entry = await pgLifecycleRepo.insertLifecycleEntry({
        id: randomUUID(),
        appointmentRef,
        patientDfn,
        clinicIen: clinicIen || undefined,
        clinicName,
        state,
        previousState: previousState || undefined,
        vistaIen: vistaIen || undefined,
        rpcUsed: rpcUsed || undefined,
        transitionNote: note || undefined,
        createdByDuz: request.session?.duz,
      });

      immutableAudit("scheduling.lifecycle_transition", "success", auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: request.session?.tenantId,
        detail: {
          appointmentRef,
          state,
          previousState: previousState || "initial",
        },
      });

      return reply.code(201).send({
        ok: true,
        data: entry,
        transition: previousState ? `${previousState} -> ${state}` : `initial -> ${state}`,
      });
    } catch (err: any) {
      log.warn("Lifecycle transition failed", { error: err.message });
      return reply.code(500).send({
        ok: false,
        error: `Lifecycle transition failed: ${err.message}`,
        pending: true,
        target: "PG scheduling_lifecycle table (requires PLATFORM_PG_URL)",
      });
    }
  });

  log.info("Scheduling routes registered (Phase 131: 19 endpoints, 12+ RPCs wired)");
}
