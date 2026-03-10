/**
 * Scheduling Routes -- Phase 63, enhanced Phase 123: SD* integration pack,
 * Phase 131: lifecycle depth + CPRS appointments + reference data + posture.
 * Phase 139: Check-in/out, request triage, clinic preferences.
 * Phase 147: SDES depth + truth gates + writeback mode indicator.
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
 *   --- Phase 139 additions ---
 *   POST /scheduling/appointments/:id/checkin  -- patient check-in lifecycle
 *   POST /scheduling/appointments/:id/checkout -- patient check-out lifecycle
 *   POST /scheduling/requests/:id/approve      -- approve scheduling request
 *   POST /scheduling/requests/:id/reject       -- reject scheduling request
 *   GET  /scheduling/clinic/:ien/preferences   -- clinic scheduling preferences
 *   PUT  /scheduling/clinic/:ien/preferences   -- update clinic preferences
 *   --- Phase 147 additions ---
 *   GET  /scheduling/appointment-types          -- SDES appointment types (File 409.1)
 *   GET  /scheduling/cancel-reasons             -- SDES cancellation reasons
 *   GET  /scheduling/clinic/:ien/resource       -- SDES clinic resource/schedule info
 *   GET  /scheduling/sdes-availability          -- SDES clinic availability slots
 *   GET  /scheduling/verify/:ref                -- Truth gate: verify appointment in VistA
 *   GET  /scheduling/mode                       -- Scheduling writeback mode indicator
 *   --- Phase 539 additions ---
 *   GET  /scheduling/recall                     -- Recall/Reminder list (SD RECALL LIST)
 *   GET  /scheduling/recall/:ien                -- Recall detail (SD RECALL GET)
 *   GET  /scheduling/parity                     -- VSE vs VistA-Evolved parity matrix
 *
 * Auth: session-based (default AUTH_RULES catch-all).
 * Audit: all writes logged to immutable-audit (no PHI).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAdapter } from '../../adapters/adapter-loader.js';
import type { SchedulingAdapter } from '../../adapters/scheduling/interface.js';
import { getRequestStore } from '../../adapters/scheduling/vista-adapter.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { log } from '../../lib/logger.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { requiresPg } from '../../platform/runtime-mode.js';
import writebackRoutes from './writeback-routes.js';
import {
  enforceTruthGate,
  getWritebackPolicy,
  trackWriteback,
  updateWritebackStatus,
} from './writeback-guard.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function getSchedulingAdapter(): SchedulingAdapter {
  const adapter = getAdapter('scheduling');
  if (!adapter) {
    throw new Error(
      'Scheduling adapter not loaded -- check ADAPTER_SCHEDULING env var and initAdapters() order'
    );
  }
  return adapter as unknown as SchedulingAdapter;
}

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || 'anonymous',
    name: s?.userName || 'unknown',
    roles: s?.role ? [s.role] : [],
  };
}

function requireSession(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.session) {
    reply.code(401).send({ ok: false, error: 'Authentication required' });
    return false;
  }
  return true;
}

function resolveTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof request.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
      ? request.session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

/* ------------------------------------------------------------------ */
/* Route registration                                                    */
/* ------------------------------------------------------------------ */

export default async function schedulingRoutes(server: FastifyInstance): Promise<void> {
  const adapter = getSchedulingAdapter();

  async function handleAppointmentRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    body: Record<string, any>
  ) {
    if (!requireSession(request, reply)) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const {
      patientDfn,
      clinicName,
      preferredDate,
      reason,
      appointmentType,
      clinicIen,
      providerDuz,
    } = body;

    if (!patientDfn || !clinicName || !preferredDate || !reason) {
      return reply.code(400).send({
        ok: false,
        error: 'patientDfn, clinicName, preferredDate, and reason are required',
      });
    }

    const result = await adapter.createAppointment({
      tenantId,
      patientDfn,
      clinicName,
      preferredDate,
      reason: String(reason).slice(0, 500),
      appointmentType: appointmentType || 'in_person',
      clinicIen,
      providerDuz,
    });

    if (result.ok && result.data && typeof result.data === 'object' && 'id' in result.data) {
      trackWriteback(String((result.data as any).id), String(patientDfn), tenantId, clinicIen);
    }

    immutableAudit('scheduling.request', result.ok ? 'success' : 'failure', auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: {
        clinicName,
        appointmentType: appointmentType || 'in_person',
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
        ? 'Appointment request submitted. Clinic will confirm scheduling.'
        : 'Appointment booked successfully.',
    });
  }

  async function handleAppointmentCheckin(
    request: FastifyRequest,
    reply: FastifyReply,
    appointmentRef: string,
    body: Record<string, any>
  ) {
    if (!requireSession(request, reply)) return;
    const { patientDfn, clinicName, clinicIen } = body;

    if (!patientDfn || !clinicName) {
      return reply.code(400).send({ ok: false, error: 'patientDfn and clinicName are required' });
    }

    try {
      const pgLifecycleRepo =
        await import('../../platform/pg/repo/pg-scheduling-lifecycle-repo.js');
      const { randomUUID } = await import('node:crypto');
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      const latest = await pgLifecycleRepo.findLatestByAppointmentRef(appointmentRef, tenantId);
      const previousState = latest?.state;
      const targetState = 'checked_in';

      if (previousState && !pgLifecycleRepo.isValidTransition(previousState, targetState)) {
        return reply.code(409).send({
          ok: false,
          error: `Cannot check in: current state is ${previousState}`,
          currentState: previousState,
        });
      }

      const entry = await pgLifecycleRepo.insertLifecycleEntry({
        id: randomUUID(),
        tenantId,
        appointmentRef,
        patientDfn,
        clinicIen: clinicIen || undefined,
        clinicName,
        state: targetState,
        previousState: previousState || undefined,
        vistaIen: undefined,
        rpcUsed: 'SDOE UPDATE ENCOUNTER',
        transitionNote: 'Patient checked in',
        createdByDuz: request.session?.duz,
      });

      immutableAudit('scheduling.checkin', 'success', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: request.session?.tenantId,
        detail: { appointmentRef, previousState: previousState || 'initial' },
      });

      // Attempt VistA check-in via SDES CHECKIN
      const rpcUsedList: string[] = [];
      let vistaCheckin: { ok: boolean; error?: string } = { ok: false };
      try {
        await safeCallRpc('SDES CHECKIN', [appointmentRef, patientDfn], { idempotent: false });
        rpcUsedList.push('SDES CHECKIN');
        vistaCheckin = { ok: true };
      } catch (checkinErr: any) {
        rpcUsedList.push('SDES CHECKIN');
        vistaCheckin = { ok: false, error: checkinErr?.message || 'SDES CHECKIN failed' };
        log.warn('SDES CHECKIN RPC failed', { err: checkinErr?.message });
      }

      return reply.code(200).send({
        ok: true,
        data: entry,
        transition: `${previousState || 'initial'} -> checked_in`,
        rpcUsed: rpcUsedList,
        vistaCheckin,
      });
    } catch (err: any) {
      log.warn('Check-in failed', { error: err.message });
      return reply.code(500).send({ ok: false, error: 'Check-in failed' });
    }
  }

  /* ---- Health ---- */
  server.get('/scheduling/health', async () => {
    const health = await adapter.healthCheck();
    return { ok: health.ok, adapter: adapter.implementationName, detail: health.detail };
  });

  /* ---- GET /scheduling/appointments?dfn=X&startDate=Y&endDate=Z ---- */
  server.get('/scheduling/appointments', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { dfn, startDate, endDate } = request.query as {
      dfn?: string;
      startDate?: string;
      endDate?: string;
    };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: 'dfn query parameter required' });
    }

    const result = await adapter.listAppointments(dfn, startDate, endDate, tenantId);

    immutableAudit('scheduling.list', result.ok ? 'success' : 'failure', auditActor(request), {
      requestId: (request as any).id,
      sourceIp: request.ip,
      tenantId: request.session?.tenantId,
      detail: { dfn: '[REDACTED]', count: result.data?.length ?? 0 },
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
  server.get(
    '/scheduling/appointments/range',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };
      if (!startDate || !endDate) {
        return reply
          .code(400)
          .send({ ok: false, error: 'startDate and endDate query parameters required' });
      }

      const result = await adapter.listEncountersByDate(startDate, endDate);
      return {
        ok: result.ok,
        data: result.data || [],
        pending: result.pending,
        target: result.target,
        vistaGrounding: result.vistaGrounding,
      };
    }
  );

  /* ---- GET /scheduling/clinics ---- */
  server.get('/scheduling/clinics', async (request: FastifyRequest, reply: FastifyReply) => {
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
  server.get('/scheduling/providers', async (request: FastifyRequest, reply: FastifyReply) => {
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
  server.get('/scheduling/slots', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { clinicIen, startDate, endDate } = request.query as {
      clinicIen?: string;
      startDate?: string;
      endDate?: string;
    };
    if (!clinicIen || !startDate || !endDate) {
      return reply
        .code(400)
        .send({ ok: false, error: 'clinicIen, startDate, and endDate required' });
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
  server.post(
    '/scheduling/appointments/request',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return handleAppointmentRequest(request, reply, ((request.body as any) || {}) as Record<string, any>);
    }
  );

  /* ---- POST /scheduling/book ---- */
  server.post('/scheduling/book', async (request: FastifyRequest, reply: FastifyReply) => {
    return handleAppointmentRequest(request, reply, ((request.body as any) || {}) as Record<string, any>);
  });

  /* ---- POST /scheduling/appointments/:id/cancel ---- */
  server.post(
    '/scheduling/appointments/:id/cancel',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const reason = body.reason || 'Patient requested cancellation';
      const patientDfn = body.patientDfn;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      const result = await adapter.cancelAppointment(id, reason, patientDfn, tenantId);

      immutableAudit('scheduling.cancel', result.ok ? 'success' : 'failure', auditActor(request), {
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
          ? 'Cancellation request submitted. Clinic will process.'
          : 'Appointment cancelled.',
      };
    }
  );

  /* ---- POST /scheduling/appointments/:id/reschedule ---- */
  server.post(
    '/scheduling/appointments/:id/reschedule',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { preferredDate, reason, patientDfn } = body;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      if (!patientDfn) {
        return reply.code(400).send({ ok: false, error: 'patientDfn is required for reschedule' });
      }

      // Cancel original + create new request
      await adapter.cancelAppointment(id, reason || 'Reschedule requested', patientDfn, tenantId);

      if (preferredDate && body.clinicName) {
        const newResult = await adapter.createAppointment({
          tenantId,
          patientDfn: patientDfn || '',
          clinicName: body.clinicName,
          preferredDate,
          reason: reason || 'Rescheduled appointment',
          appointmentType: body.appointmentType || 'in_person',
        });

        immutableAudit('scheduling.reschedule', 'success', auditActor(request), {
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
          notice: 'Reschedule request submitted. Clinic will confirm new date.',
        };
      }

      return {
        ok: true,
        pending: true,
        target: 'SDEC APPADD + SDEC APPDEL',
        notice: 'Reschedule request noted. Clinic will contact you.',
      };
    }
  );

  /* ---- GET /scheduling/requests ---- */
  server.get('/scheduling/requests', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    // Phase 152: PG is source of truth; Map fallback only in dev mode
    const merged = new Map<string, any>();
    let pgAvailable = false;
    try {
      const pgRequestRepo = await import('../../platform/pg/repo/pg-scheduling-request-repo.js');
      try {
        const pgRows = await pgRequestRepo.findAllActiveRequests(tenantId);
        for (const row of pgRows) merged.set(row.id, row);
        pgAvailable = true;
      } catch (queryErr: any) {
        // PG module loaded but query failed (connection, table, etc.)
        if (requiresPg()) {
          log.error('Scheduling PG query failed in rc/prod', { error: queryErr.message });
          return reply.code(500).send({
            ok: false,
            error: 'Scheduling request query failed',
          });
        }
      }
    } catch {
      // PG module import failed
      if (requiresPg()) {
        return reply.code(503).send({
          ok: false,
          error: 'Scheduling request store requires PostgreSQL in rc/prod mode',
          target: 'PLATFORM_PG_URL',
        });
      }
    }

    // Dev-only fallback: merge in-memory store entries not already in PG
    if (!pgAvailable || !requiresPg()) {
      const store = await getRequestStore();
      for (const [id, req] of store.entries()) {
        if (!req.tenantId || req.tenantId !== tenantId) continue;
        if (!merged.has(id)) merged.set(id, req);
      }
      if (!pgAvailable) {
        log.warn('DEV_ONLY_FALLBACK: scheduling requests served from in-memory store');
      }
    }

    const requests = [...merged.values()].sort((a: any, b: any) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    return { ok: true, data: requests, count: requests.length };
  });

  /* ================================================================== */
  /* Phase 123: New SD* endpoints                                        */
  /* ================================================================== */

  /* ---- GET /scheduling/encounters/:ien/detail ---- */
  server.get(
    '/scheduling/encounters/:ien/detail',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };
      if (!ien) {
        return reply.code(400).send({ ok: false, error: 'Encounter IEN required' });
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
    }
  );

  /* ---- GET /scheduling/encounters/:ien/providers ---- */
  server.get(
    '/scheduling/encounters/:ien/providers',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };
      if (!ien) {
        return reply.code(400).send({ ok: false, error: 'Encounter IEN required' });
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
    }
  );

  /* ---- GET /scheduling/encounters/:ien/diagnoses ---- */
  server.get(
    '/scheduling/encounters/:ien/diagnoses',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };
      if (!ien) {
        return reply.code(400).send({ ok: false, error: 'Encounter IEN required' });
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
    }
  );

  /* ---- GET /scheduling/waitlist?clinicIen=X ---- */
  server.get('/scheduling/waitlist', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { clinicIen } = request.query as { clinicIen?: string };

    const result = await adapter.getWaitList(clinicIen, tenantId);
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
  server.get(
    '/scheduling/appointments/cprs',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { dfn } = request.query as { dfn?: string };
      if (!dfn) {
        return reply.code(400).send({ ok: false, error: 'dfn query parameter required' });
      }

      const result = await adapter.getAppointmentsCprs(dfn);

      immutableAudit(
        'scheduling.cprs_apptlist',
        result.ok ? 'success' : 'failure',
        auditActor(request),
        {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: { dfn: '[REDACTED]', count: result.data?.length ?? 0 },
        }
      );

      return {
        ok: result.ok,
        data: result.data || [],
        count: (result.data || []).length,
        pending: result.pending,
        target: result.target,
        error: result.error,
        vistaGrounding: result.vistaGrounding,
      };
    }
  );

  /* ---- GET /scheduling/reference-data ---- */
  server.get('/scheduling/reference-data', async (request: FastifyRequest, reply: FastifyReply) => {
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
  server.get('/scheduling/posture', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;

    const result = await adapter.getRpcPosture();
    const entries = result.data || [];
    const summary = {
      available: entries.filter((e) => e.status === 'available').length,
      callableNoData: entries.filter((e) => e.status === 'callable_no_data').length,
      notInstalled: entries.filter((e) => e.status === 'not_installed').length,
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
  server.get('/scheduling/lifecycle', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { patientDfn, appointmentRef, state, limit } = request.query as {
      patientDfn?: string;
      appointmentRef?: string;
      state?: string;
      limit?: string;
    };

    try {
      const pgLifecycleRepo =
        await import('../../platform/pg/repo/pg-scheduling-lifecycle-repo.js');

      let entries;
      if (appointmentRef) {
        entries = await pgLifecycleRepo.findLifecycleByAppointmentRef(appointmentRef, tenantId);
      } else if (patientDfn) {
        entries = await pgLifecycleRepo.findLifecycleByPatient(patientDfn, tenantId, parseInt(limit || '50', 10));
      } else if (state) {
        entries = await pgLifecycleRepo.findLifecycleByState(state, tenantId, parseInt(limit || '100', 10));
      } else {
        // Return stats summary when no filter
        const counts = await pgLifecycleRepo.countByState(tenantId);
        const total = await pgLifecycleRepo.countTotal(tenantId);
        return { ok: true, data: [], stats: { total, byState: counts } };
      }

      return {
        ok: true,
        data: entries || [],
        count: (entries || []).length,
      };
    } catch (err: any) {
      log.warn('Lifecycle query failed', { error: err.message });
      return {
        ok: false,
        data: [],
        error: 'Lifecycle query failed',
        pending: true,
        target: 'PG scheduling_lifecycle table (requires PLATFORM_PG_URL)',
      };
    }
  });

  /* ---- POST /scheduling/lifecycle/transition ---- */
  server.post(
    '/scheduling/lifecycle/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const body = (request.body as any) || {};
      const { appointmentRef, patientDfn, clinicName, clinicIen, state, vistaIen, rpcUsed, note } =
        body;

      if (!appointmentRef || !patientDfn || !clinicName || !state) {
        return reply.code(400).send({
          ok: false,
          error: 'appointmentRef, patientDfn, clinicName, and state are required',
        });
      }

      try {
        const pgLifecycleRepo =
          await import('../../platform/pg/repo/pg-scheduling-lifecycle-repo.js');
        const { randomUUID } = await import('node:crypto');
        const tenantId = requireTenantId(request, reply);
        if (!tenantId) return;

        // Validate state
        if (!pgLifecycleRepo.LIFECYCLE_STATES.includes(state)) {
          return reply.code(400).send({
            ok: false,
            error: `Invalid state: ${state}. Valid states: ${pgLifecycleRepo.LIFECYCLE_STATES.join(', ')}`,
          });
        }

        // Check previous state for transition validation
        const latest = await pgLifecycleRepo.findLatestByAppointmentRef(appointmentRef, tenantId);
        const previousState = latest?.state;

        if (previousState && !pgLifecycleRepo.isValidTransition(previousState, state)) {
          return reply.code(409).send({
            ok: false,
            error: `Invalid transition: ${previousState} -> ${state}`,
            currentState: previousState,
            validTransitions: [
              'requested',
              'waitlisted',
              'booked',
              'checked_in',
              'completed',
              'cancelled',
              'no_show',
            ].filter((s) => pgLifecycleRepo.isValidTransition(previousState, s)),
          });
        }

        const entry = await pgLifecycleRepo.insertLifecycleEntry({
          id: randomUUID(),
          tenantId,
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

        immutableAudit('scheduling.lifecycle_transition', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: {
            appointmentRef,
            state,
            previousState: previousState || 'initial',
          },
        });

        return reply.code(201).send({
          ok: true,
          data: entry,
          transition: previousState ? `${previousState} -> ${state}` : `initial -> ${state}`,
        });
      } catch (err: any) {
        log.warn('Lifecycle transition failed', { error: err.message });
        return reply.code(500).send({
          ok: false,
          error: 'Lifecycle transition failed',
          pending: true,
          target: 'PG scheduling_lifecycle table (requires PLATFORM_PG_URL)',
        });
      }
    }
  );

  /* ================================================================== */
  /* Phase 139: Check-in/out, Request triage, Clinic preferences         */
  /* ================================================================== */

  /* ---- POST /scheduling/appointments/:id/checkin ---- */
  server.post(
    '/scheduling/appointments/:id/checkin',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      return handleAppointmentCheckin(
        request,
        reply,
        id,
        ((request.body as any) || {}) as Record<string, any>
      );
    }
  );

  /* ---- POST /scheduling/check-in ---- */
  server.post('/scheduling/check-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = ((request.body as any) || {}) as Record<string, any>;
    const appointmentRef = String(body.appointmentId || body.id || '').trim();
    if (!appointmentRef) {
      return reply.code(400).send({ ok: false, error: 'appointmentId is required' });
    }
    return handleAppointmentCheckin(request, reply, appointmentRef, body);
  });

  /* ---- POST /scheduling/appointments/:id/checkout ---- */
  server.post(
    '/scheduling/appointments/:id/checkout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { patientDfn, clinicName, clinicIen, disposition } = body;

      if (!patientDfn || !clinicName) {
        return reply.code(400).send({ ok: false, error: 'patientDfn and clinicName are required' });
      }

      try {
        const pgLifecycleRepo =
          await import('../../platform/pg/repo/pg-scheduling-lifecycle-repo.js');
        const { randomUUID } = await import('node:crypto');
        const tenantId = requireTenantId(request, reply);
        if (!tenantId) return;

        const latest = await pgLifecycleRepo.findLatestByAppointmentRef(id, tenantId);
        const previousState = latest?.state;
        const targetState = 'completed';

        if (previousState && !pgLifecycleRepo.isValidTransition(previousState, targetState)) {
          return reply.code(409).send({
            ok: false,
            error: `Cannot check out: current state is ${previousState}`,
            currentState: previousState,
          });
        }

        const entry = await pgLifecycleRepo.insertLifecycleEntry({
          id: randomUUID(),
          tenantId,
          appointmentRef: id,
          patientDfn,
          clinicIen: clinicIen || undefined,
          clinicName,
          state: targetState,
          previousState: previousState || undefined,
          vistaIen: undefined,
          rpcUsed: 'SDOE UPDATE ENCOUNTER',
          transitionNote: disposition ? `Checkout: ${disposition}` : 'Patient checked out',
          createdByDuz: request.session?.duz,
        });

        immutableAudit('scheduling.checkout', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: { appointmentRef: id, previousState: previousState || 'initial', disposition },
        });

        // Attempt VistA checkout via SDES CHECKOUT
        const rpcUsedList: string[] = [];
        let vistaCheckout: { ok: boolean; error?: string } = { ok: false };
        try {
          await safeCallRpc('SDES CHECKOUT', [id, patientDfn], { idempotent: false });
          rpcUsedList.push('SDES CHECKOUT');
          vistaCheckout = { ok: true };
        } catch (checkoutErr: any) {
          rpcUsedList.push('SDES CHECKOUT');
          vistaCheckout = { ok: false, error: checkoutErr?.message || 'SDES CHECKOUT failed' };
          log.warn('SDES CHECKOUT RPC failed', { err: checkoutErr?.message });
        }

        return reply.code(200).send({
          ok: true,
          data: entry,
          transition: `${previousState || 'initial'} -> completed`,
          rpcUsed: rpcUsedList,
          vistaCheckout,
        });
      } catch (err: any) {
        log.warn('Checkout failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Checkout failed' });
      }
    }
  );

  /* ---- POST /scheduling/requests/:id/approve ---- */
  server.post(
    '/scheduling/requests/:id/approve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { id } = request.params as { id: string };
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      try {
        const pgRequestRepo = await import('../../platform/pg/repo/pg-scheduling-request-repo.js');

        const existing = await pgRequestRepo.findSchedulingRequestById(id, tenantId);
        if (!existing) {
          // Phase 152: In rc/prod, do not fall back to in-memory store
          if (requiresPg()) {
            return reply.code(404).send({ ok: false, error: 'Scheduling request not found' });
          }
          // Dev-only fallback: try in-memory store
          log.warn('DEV_ONLY_FALLBACK: approve using in-memory scheduling store');
          const store = await getRequestStore();
          const memReq = store.get(id);
          if (!memReq || !memReq.tenantId || memReq.tenantId !== tenantId) {
            return reply.code(404).send({ ok: false, error: 'Request not found' });
          }
          if (memReq.status !== 'pending') {
            return reply
              .code(409)
              .send({ ok: false, error: `Cannot approve: request is already ${memReq.status}` });
          }
          memReq.status = 'approved';
          (memReq as any).updatedAt = new Date().toISOString();
          trackWriteback(id, memReq.patientDfn, tenantId);
          updateWritebackStatus(id, 'approved');

          const policy = await getWritebackPolicy();
          let writeback: any = {
            status: 'approved',
            mode: policy.mode,
            requireTruthGate: policy.requireTruthGate,
            detail: policy.detail,
          };

          if (policy.mode !== 'request_only') {
            writeback = await enforceTruthGate(id, memReq.patientDfn, tenantId, request.session?.duz || 'unknown');
          }

          immutableAudit('scheduling.approve', 'success', auditActor(request), {
            requestId: (request as any).id,
            sourceIp: request.ip,
            tenantId: request.session?.tenantId,
            detail: {
              schedulingRequestId: id,
              source: 'in-memory-dev',
              writebackStatus: writeback.status,
              writebackMode: policy.mode,
            },
          });

          return {
            ok: true,
            data: memReq,
            writeback,
            notice:
              writeback.status === 'scheduled'
                ? 'Request approved and VistA confirmed scheduling.'
                : 'Request approved. Keep status as approved until VistA confirms scheduling.',
          };
        }

        if (existing.status !== 'pending') {
          return reply
            .code(409)
            .send({ ok: false, error: `Cannot approve: request is already ${existing.status}` });
        }

        const updated = await pgRequestRepo.updateSchedulingRequest(id, tenantId, {
          status: 'approved',
        });

        trackWriteback(id, existing.patientDfn, tenantId);
        updateWritebackStatus(id, 'approved');

        const policy = await getWritebackPolicy();
        let writeback: any = {
          status: 'approved',
          mode: policy.mode,
          requireTruthGate: policy.requireTruthGate,
          detail: policy.detail,
        };

        if (policy.mode !== 'request_only') {
          writeback = await enforceTruthGate(id, existing.patientDfn, tenantId, request.session?.duz || 'unknown');
        }

        immutableAudit('scheduling.approve', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: {
            schedulingRequestId: id,
            source: 'pg',
            writebackStatus: writeback.status,
            writebackMode: policy.mode,
          },
        });

        return {
          ok: true,
          data: updated,
          writeback,
          notice:
            writeback.status === 'scheduled'
              ? 'Request approved and VistA confirmed scheduling.'
              : 'Request approved. Keep status as approved until VistA confirms scheduling.',
        };
      } catch (err: any) {
        // Phase 152: If PG import itself failed in rc/prod, return 503
        if (
          requiresPg() &&
          (err.message?.includes('Cannot find module') || err.code === 'ERR_MODULE_NOT_FOUND')
        ) {
          return reply.code(503).send({
            ok: false,
            error: 'Scheduling request approval requires PostgreSQL in rc/prod mode',
            target: 'PLATFORM_PG_URL',
          });
        }
        log.warn('Request approve failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Approve failed' });
      }
    }
  );

  /* ---- POST /scheduling/requests/:id/reject ---- */
  server.post(
    '/scheduling/requests/:id/reject',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const reason = body.reason || 'Rejected by scheduling staff';
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      try {
        const pgRequestRepo = await import('../../platform/pg/repo/pg-scheduling-request-repo.js');

        const existing = await pgRequestRepo.findSchedulingRequestById(id, tenantId);
        if (!existing) {
          // Phase 152: In rc/prod, do not fall back to in-memory store
          if (requiresPg()) {
            return reply.code(404).send({ ok: false, error: 'Scheduling request not found' });
          }
          // Dev-only fallback
          log.warn('DEV_ONLY_FALLBACK: reject using in-memory scheduling store');
          const store = await getRequestStore();
          const memReq = store.get(id);
          if (!memReq || !memReq.tenantId || memReq.tenantId !== tenantId) {
            return reply.code(404).send({ ok: false, error: 'Request not found' });
          }
          if (memReq.status !== 'pending') {
            return reply
              .code(409)
              .send({ ok: false, error: `Cannot reject: request is already ${memReq.status}` });
          }
          memReq.status = 'rejected';
          (memReq as any).updatedAt = new Date().toISOString();

          immutableAudit('scheduling.reject', 'success', auditActor(request), {
            requestId: (request as any).id,
            sourceIp: request.ip,
            tenantId: request.session?.tenantId,
            detail: { schedulingRequestId: id, reason, source: 'in-memory-dev' },
          });

          return { ok: true, data: memReq, notice: `Request rejected: ${reason}` };
        }

        if (existing.status !== 'pending') {
          return reply
            .code(409)
            .send({ ok: false, error: `Cannot reject: request is already ${existing.status}` });
        }

        const updated = await pgRequestRepo.updateSchedulingRequest(id, tenantId, {
          status: 'rejected',
        });

        immutableAudit('scheduling.reject', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: { schedulingRequestId: id, reason, source: 'pg' },
        });

        return {
          ok: true,
          data: updated,
          notice: `Request rejected: ${reason}`,
        };
      } catch (err: any) {
        // Phase 152: If PG import itself failed in rc/prod, return 503
        if (
          requiresPg() &&
          (err.message?.includes('Cannot find module') || err.code === 'ERR_MODULE_NOT_FOUND')
        ) {
          return reply.code(503).send({
            ok: false,
            error: 'Scheduling request rejection requires PostgreSQL in rc/prod mode',
            target: 'PLATFORM_PG_URL',
          });
        }
        log.warn('Request reject failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Reject failed' });
      }
    }
  );

  /* ---- GET /scheduling/clinic/:ien/preferences ---- */
  server.get(
    '/scheduling/clinic/:ien/preferences',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };

      try {
        const cpRepo = await import('../../platform/pg/repo/pg-clinic-preferences-repo.js');
        const tenantId = requireTenantId(request, reply);
        if (!tenantId) return;
        const prefs = await cpRepo.findByClinicIen(ien, tenantId);

        if (!prefs) {
          return {
            ok: true,
            data: null,
            defaults: {
              timezone: 'America/New_York',
              slotDurationMinutes: 30,
              maxDailySlots: 20,
            },
            notice: 'No preferences configured for this clinic. Defaults shown.',
          };
        }

        return { ok: true, data: prefs };
      } catch (err: any) {
        log.warn('Clinic preferences read failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Preferences read failed' });
      }
    }
  );

  /* ---- PUT /scheduling/clinic/:ien/preferences ---- */
  server.put(
    '/scheduling/clinic/:ien/preferences',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };
      const body = (request.body as any) || {};

      if (!body.clinicName) {
        return reply.code(400).send({ ok: false, error: 'clinicName is required' });
      }

      try {
        const cpRepo = await import('../../platform/pg/repo/pg-clinic-preferences-repo.js');
        const { randomUUID } = await import('node:crypto');
        const tenantId = requireTenantId(request, reply);
        if (!tenantId) return;

        const prefs = await cpRepo.upsertClinicPreferences({
          id: randomUUID(),
          tenantId,
          clinicIen: ien,
          clinicName: body.clinicName,
          timezone: body.timezone,
          slotDurationMinutes: body.slotDurationMinutes,
          maxDailySlots: body.maxDailySlots,
          displayConfig: body.displayConfig ? JSON.stringify(body.displayConfig) : undefined,
          operatingHours: body.operatingHours ? JSON.stringify(body.operatingHours) : undefined,
        });

        immutableAudit('scheduling.clinic_preferences', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId,
          detail: { clinicIen: ien, clinicName: body.clinicName },
        });

        return { ok: true, data: prefs };
      } catch (err: any) {
        log.warn('Clinic preferences update failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Preferences update failed' });
      }
    }
  );

  /* ================================================================== */
  /* Phase 147: SDES depth + truth gate endpoints                        */
  /* ================================================================== */

  /* ---- GET /scheduling/appointment-types ---- */
  server.get(
    '/scheduling/appointment-types',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      try {
        const adapter = getSchedulingAdapter();
        const result = await adapter.getAppointmentTypes();
        return result;
      } catch (err: any) {
        log.warn('GET /scheduling/appointment-types failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to retrieve appointment types' });
      }
    }
  );

  /* ---- GET /scheduling/cancel-reasons ---- */
  server.get('/scheduling/cancel-reasons', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    try {
      const adapter = getSchedulingAdapter();
      const result = await adapter.getCancelReasons();
      return result;
    } catch (err: any) {
      log.warn('GET /scheduling/cancel-reasons failed', { error: err.message });
      return reply.code(500).send({ ok: false, error: 'Failed to retrieve cancel reasons' });
    }
  });

  /* ---- GET /scheduling/clinic/:ien/resource ---- */
  server.get(
    '/scheduling/clinic/:ien/resource',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { ien } = request.params as { ien: string };
      if (!ien) {
        return reply.code(400).send({ ok: false, error: 'ien is required' });
      }
      try {
        const adapter = getSchedulingAdapter();
        const result = await adapter.getClinicResource(ien);
        return result;
      } catch (err: any) {
        log.warn('GET /scheduling/clinic/:ien/resource failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to retrieve clinic resource' });
      }
    }
  );

  /* ---- GET /scheduling/sdes-availability ---- */
  server.get(
    '/scheduling/sdes-availability',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { clinicIen, startDate, endDate } = request.query as {
        clinicIen?: string;
        startDate?: string;
        endDate?: string;
      };
      if (!clinicIen || !startDate || !endDate) {
        return reply.code(400).send({
          ok: false,
          error: 'clinicIen, startDate, and endDate query params are required',
        });
      }
      try {
        const adapter = getSchedulingAdapter();
        const result = await adapter.getSdesAvailability(clinicIen, startDate, endDate);
        return result;
      } catch (err: any) {
        log.warn('GET /scheduling/sdes-availability failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to retrieve SDES availability' });
      }
    }
  );

  /* ---- GET /scheduling/verify/:ref ---- */
  server.get('/scheduling/verify/:ref', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { ref } = request.params as { ref: string };
    const { dfn } = request.query as { dfn?: string };
    if (!ref || !dfn) {
      return reply
        .code(400)
        .send({ ok: false, error: 'ref param and dfn query param are required' });
    }
    try {
      const adapter = getSchedulingAdapter();
      const result = await adapter.verifyAppointment(ref, dfn);

      immutableAudit(
        'scheduling.truth_gate',
        result.data?.passed ? 'success' : 'failure',
        auditActor(request),
        {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: {
            gate: 'vista_verify',
            appointmentRef: ref,
            patientDfn: '[REDACTED]',
            passed: result.data?.passed ?? false,
            method: result.data?.verificationMethod ?? 'unknown',
          },
        }
      );

      return result;
    } catch (err: any) {
      log.warn('GET /scheduling/verify/:ref failed', { error: err.message });
      return reply.code(500).send({ ok: false, error: 'Failed to verify appointment' });
    }
  });

  /* ---- GET /scheduling/mode ---- */
  server.get('/scheduling/mode', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    try {
      const adapter = getSchedulingAdapter();
      const result = await adapter.getSchedulingMode();
      return result;
    } catch (err: any) {
      log.warn('GET /scheduling/mode failed', { error: err.message });
      return reply.code(500).send({ ok: false, error: 'Failed to retrieve scheduling mode' });
    }
  });

  /* ==== Phase 539: Recall / Reminder endpoints ==== */

  /** In-memory recall store for future VistA integration */
  const recallStore = new Map<string, any>();

  /* ---- GET /scheduling/recall ---- */
  server.get('/scheduling/recall', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: 'dfn query param required' });
    }

    const rpcUsed: string[] = [];
    try {
      const lines = await safeCallRpc('SD RECALL LIST', [dfn]);
      rpcUsed.push('SD RECALL LIST');
      const data = lines.filter((l: string) => l.trim()).map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0]?.trim(), date: parts[1]?.trim(), provider: parts[2]?.trim(), detail: line };
      });
      return { ok: true, data, rpcUsed, source: 'vista' };
    } catch (err: any) {
      rpcUsed.push('SD RECALL LIST');
      log.warn('SD RECALL LIST failed, trying SDES GET RECALL ENTRIES', { err: err?.message });
    }

    try {
      const lines = await safeCallRpc('SDES GET RECALL ENTRIES', [dfn]);
      rpcUsed.push('SDES GET RECALL ENTRIES');
      const data = lines.filter((l: string) => l.trim()).map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0]?.trim(), date: parts[1]?.trim(), provider: parts[2]?.trim(), detail: line };
      });
      return { ok: true, data, rpcUsed, source: 'vista' };
    } catch (err2: any) {
      rpcUsed.push('SDES GET RECALL ENTRIES');
      return reply.code(502).send({
        ok: false,
        error: `Recall RPCs failed: ${err2?.message || 'RPC error'}`,
        rpcUsed,
      });
    }
  });

  /* ---- GET /scheduling/recall/:ien ---- */
  server.get('/scheduling/recall/:ien', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const { ien } = request.params as { ien: string };
    if (!ien) {
      return reply.code(400).send({ ok: false, error: 'ien param required' });
    }

    const rpcUsed: string[] = [];
    try {
      const lines = await safeCallRpc('SD RECALL GET', [ien]);
      rpcUsed.push('SD RECALL GET');
      return { ok: true, data: lines.join('\n'), rpcUsed, source: 'vista' };
    } catch (err: any) {
      rpcUsed.push('SD RECALL GET');
      return reply.code(502).send({
        ok: false,
        error: `SD RECALL GET failed: ${err?.message || 'RPC error'}`,
        rpcUsed,
      });
    }
  });

  /* ---- GET /scheduling/parity ---- */
  server.get('/scheduling/parity', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireSession(request, reply)) return;
    const vseSurfaces = [
      {
        id: 'vse-appointment-book',
        name: 'Appointment Book / Grid View',
        priority: 'p0-critical',
        veStatus: 'partial',
        coveragePct: 83,
        endpoints: ['/scheduling/appointments/range', '/scheduling/clinics', '/scheduling/slots'],
        rpcs: ['SDOE LIST ENCOUNTERS FOR DATES', 'SDEC APPSLOTS', 'SDES GET CLIN AVAILABILITY'],
        gaps: ['Visual calendar grid not yet rendered -- data available via API'],
      },
      {
        id: 'vse-patient-checkin',
        name: 'Patient Check-In',
        priority: 'p0-critical',
        veStatus: 'partial',
        coveragePct: 50,
        endpoints: [
          '/scheduling/appointments/:id/checkin',
          '/scheduling/appointments/:id/checkout',
        ],
        rpcs: ['SDOE UPDATE ENCOUNTER', 'SDES CHECKIN', 'SDES CHECKOUT'],
        gaps: ['VistA SDOE writeback pending -- lifecycle tracked locally'],
      },
      {
        id: 'vse-wait-list',
        name: 'Wait List Management',
        priority: 'p1-high',
        veStatus: 'partial',
        coveragePct: 50,
        endpoints: [
          '/scheduling/waitlist',
          '/scheduling/requests',
          '/scheduling/requests/:id/approve',
        ],
        rpcs: ['SD W/L RETRIVE FULL DATA', 'SD W/L CREATE FILE'],
        gaps: ['Dedicated wait-list UI tab added in Phase 539 -- actions are request-queue based'],
      },
      {
        id: 'vse-recall-reminder',
        name: 'Recall/Reminder Management',
        priority: 'p2-medium',
        veStatus: 'partial',
        coveragePct: 33,
        endpoints: ['/scheduling/recall', '/scheduling/recall/:ien'],
        rpcs: ['SD RECALL LIST', 'SD RECALL GET', 'SDES GET RECALL ENTRIES'],
        gaps: ['VistA File 403.5 may be empty in sandbox -- RPCs wired, data depends on VistA config'],
      },
      {
        id: 'vse-clinic-profile',
        name: 'Clinic Profile Setup',
        priority: 'p2-medium',
        veStatus: 'partial',
        coveragePct: 50,
        endpoints: ['/scheduling/clinic/:ien/preferences', '/scheduling/clinic/:ien/resource'],
        rpcs: ['SDES GET RESOURCE BY CLINIC', 'SDES GET CLINIC INFO2'],
        gaps: ['Admin-level clinic configuration via preferences endpoint'],
      },
      {
        id: 'vse-resource-view',
        name: 'Resource/Provider View',
        priority: 'p2-medium',
        veStatus: 'partial',
        coveragePct: 50,
        endpoints: [
          '/scheduling/providers',
          '/scheduling/clinic/:ien/resource',
          '/scheduling/sdes-availability',
        ],
        rpcs: [
          'SD W/L RETRIVE PERSON(200)',
          'SDES GET RESOURCE BY CLINIC',
          'SDES GET CLIN AVAILABILITY',
        ],
        gaps: ['Provider availability grid not yet rendered -- data available via API'],
      },
    ];
    const totalPct = Math.round(
      vseSurfaces.reduce((s, v) => s + v.coveragePct, 0) / vseSurfaces.length
    );
    return {
      ok: true,
      system: 'vse-vs-gui',
      overallCoveragePct: totalPct,
      surfaces: vseSurfaces,
      endpointCount: 38,
      rpcCount: 25,
      capabilityCount: 30,
      generatedAt: new Date().toISOString(),
    };
  });

  /* ================================================================== */
  /* Direct VistA SDEC write paths (SDEC APPADD confirmed IEN 3676)     */
  /* ================================================================== */

  /* ---- POST /scheduling/appointments/create ---- */
  server.post(
    '/scheduling/appointments/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      const body = (request.body as any) || {};
      const {
        patientDfn,
        clinicIen,
        appointmentDateTime,
        appointmentLength,
        appointmentTypeIen,
        providerDuz,
        reason,
      } = body;

      if (!patientDfn || !clinicIen || !appointmentDateTime) {
        return reply.code(400).send({
          ok: false,
          error: 'patientDfn, clinicIen, and appointmentDateTime are required',
        });
      }

      const rpcUsed = ['SDEC APPADD'];

      try {
        const lines = await safeCallRpc(
          'SDEC APPADD',
          [
            String(patientDfn),
            String(clinicIen),
            String(appointmentDateTime),
            String(appointmentLength || '30'),
            String(appointmentTypeIen || ''),
            String(providerDuz || ''),
            String(reason || ''),
          ],
          { idempotent: false }
        );

        const hasError = lines.some((line: string) =>
          /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|doesn't exist/i.test(line)
        );

        if (hasError) {
          return reply.code(502).send({
            ok: false,
            error: `SDEC APPADD returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
            rpcUsed,
            source: 'vista',
          });
        }

        const status = lines[0]?.trim() || '';
        const appointmentIen = lines[1]?.trim() || '';

        immutableAudit('scheduling.sdec_appadd', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: {
            rpc: 'SDEC APPADD',
            clinicIen,
            appointmentIen,
          },
        });

        return reply.code(201).send({
          ok: true,
          status,
          appointmentIen,
          data: lines.slice(1).filter((l: string) => l.trim()),
          rpcUsed,
          source: 'vista',
        });
      } catch (err: any) {
        immutableAudit('scheduling.sdec_appadd', 'failure', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: request.session?.tenantId,
          detail: { rpc: 'SDEC APPADD', error: String(err?.message || '').substring(0, 80) },
        });
        return reply.code(502).send({
          ok: false,
          error: `SDEC APPADD failed: ${String(err?.message || 'unknown').substring(0, 120)}`,
          rpcUsed,
          source: 'vista',
        });
      }
    }
  );

  /* ---- POST /scheduling/appointments/:id/cancel-vista ---- */
  server.post(
    '/scheduling/appointments/:id/cancel-vista',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;

      const { id: appointmentIen } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { reason, cancelReasonIen, patientDfn } = body;

      if (!appointmentIen) {
        return reply.code(400).send({ ok: false, error: 'appointment IEN path param required' });
      }

      const rpcUsed: string[] = [];

      // Try SDES CANCEL APPOINTMENT 2 first (known callable in VEHU)
      try {
        const lines = await safeCallRpc(
          'SDES CANCEL APPOINTMENT 2',
          [appointmentIen, String(cancelReasonIen || ''), String(reason || 'Cancelled')],
          { idempotent: false }
        );
        rpcUsed.push('SDES CANCEL APPOINTMENT 2');

        const hasError = lines.some((line: string) =>
          /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|doesn't exist/i.test(line)
        );

        if (!hasError) {
          immutableAudit('scheduling.sdec_appdel', 'success', auditActor(request), {
            requestId: (request as any).id,
            sourceIp: request.ip,
            tenantId: request.session?.tenantId,
            detail: { rpc: 'SDES CANCEL APPOINTMENT 2', appointmentIen },
          });

          return {
            ok: true,
            status: lines[0]?.trim() || 'cancelled',
            data: lines.filter((l: string) => l.trim()),
            rpcUsed,
            source: 'vista',
          };
        }
        log.warn('SDES CANCEL APPOINTMENT 2 returned error, trying ORWDXA DC fallback');
      } catch (err: any) {
        rpcUsed.push('SDES CANCEL APPOINTMENT 2');
        log.warn('SDES CANCEL APPOINTMENT 2 failed', { err: err?.message });
      }

      // Fallback: ORWDXA DC (order discontinue -- works for booked appointments)
      if (patientDfn) {
        try {
          const lines = await safeCallRpc(
            'ORWDXA DC',
            [String(patientDfn), appointmentIen, request.session?.duz || '', '', String(reason || 'Cancelled')],
            { idempotent: false }
          );
          rpcUsed.push('ORWDXA DC');

          immutableAudit('scheduling.sdec_appdel', 'success', auditActor(request), {
            requestId: (request as any).id,
            sourceIp: request.ip,
            tenantId: request.session?.tenantId,
            detail: { rpc: 'ORWDXA DC', appointmentIen },
          });

          return {
            ok: true,
            status: 'cancelled',
            data: lines.filter((l: string) => l.trim()),
            rpcUsed,
            source: 'vista',
          };
        } catch (dcErr: any) {
          rpcUsed.push('ORWDXA DC');
          log.warn('ORWDXA DC fallback failed', { err: dcErr?.message });
        }
      }

      immutableAudit('scheduling.sdec_appdel', 'failure', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: request.session?.tenantId,
        detail: { appointmentIen },
      });

      return reply.code(502).send({
        ok: false,
        error: 'Appointment cancellation failed: both SDES CANCEL APPOINTMENT 2 and ORWDXA DC failed',
        rpcUsed,
        source: 'vista',
      });
    }
  );

  // Phase 170: Register writeback guard routes
  server.register(writebackRoutes);

  log.info(
    'Scheduling routes registered (40 endpoints, recall + parity + writeback guard + SDEC write paths)'
  );
}
