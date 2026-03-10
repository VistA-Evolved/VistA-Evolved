/**
 * Infusion / BCMA Safety Bridge -- Routes
 *
 * Phase 385 (W21-P8): REST endpoints for infusion pump event staging,
 * BCMA session management, and right-6 medication safety verification.
 *
 * Endpoints:
 *
 * Pump Events:
 *   POST /devices/infusion/pump-events        -- Ingest pump event (service auth)
 *   GET  /devices/infusion/pump-events        -- List pump events
 *   GET  /devices/infusion/pump-events/:id    -- Get pump event
 *   PATCH /devices/infusion/pump-events/:id/verify -- Mark VistA-verified
 *
 * BCMA Sessions:
 *   POST /devices/bcma/sessions               -- Start BCMA session
 *   GET  /devices/bcma/sessions               -- List BCMA sessions
 *   GET  /devices/bcma/sessions/:id           -- Get BCMA session
 *   POST /devices/bcma/sessions/:id/patient-scan   -- Record patient scan
 *   POST /devices/bcma/sessions/:id/medication-scan -- Record medication scan
 *   POST /devices/bcma/sessions/:id/right6-check   -- Perform right-6 check
 *   POST /devices/bcma/sessions/:id/complete        -- Complete session
 *
 * Stats & Audit:
 *   GET  /devices/infusion/stats              -- Infusion & BCMA statistics
 *   GET  /devices/infusion/audit              -- Audit log
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireDeviceServiceKey } from './service-key-guard.js';
import {
  createPumpEvent,
  getPumpEvent,
  listPumpEvents,
  updatePumpEventVerification,
  createBcmaSession,
  getBcmaSession,
  listBcmaSessions,
  recordPatientScan,
  recordMedicationScan,
  performRight6Check,
  completeBcmaSession,
  getInfusionBcmaStats,
  getInfusionAudit,
} from './infusion-bcma-store.js';

const DEFAULT_TENANT = 'default';

function tenant(req: FastifyRequest): string {
  return (req.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

export default async function infusionBcmaRoutes(server: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // Pump Events
  // -----------------------------------------------------------------------

  /** POST /devices/infusion/pump-events -- ingest from pump gateway */
  server.post('/devices/infusion/pump-events', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireDeviceServiceKey(req, reply)) return reply;
    const body = (req.body as any) || {};
    if (!body.pumpSerial || !body.eventType) {
      return reply.code(400).send({ ok: false, error: 'pumpSerial and eventType required' });
    }
    const ev = createPumpEvent(tenant(req), {
      pumpSerial: body.pumpSerial,
      pumpModel: body.pumpModel,
      channel: body.channel,
      eventType: body.eventType,
      patientDfn: body.patientDfn,
      orderRef: body.orderRef,
      medication: body.medication,
      rate: body.rate,
      vtbi: body.vtbi,
      volumeInfused: body.volumeInfused,
      concentration: body.concentration,
      detail: body.detail,
      pumpTimestamp: body.pumpTimestamp || new Date().toISOString(),
    });
    return reply.code(201).send({ ok: true, pumpEvent: ev });
  });

  /** GET /devices/infusion/pump-events -- list */
  server.get('/devices/infusion/pump-events', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as any;
    const events = listPumpEvents(tenant(req), {
      pumpSerial: q.pumpSerial,
      patientDfn: q.patientDfn,
      eventType: q.eventType,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, count: events.length, pumpEvents: events };
  });

  /** GET /devices/infusion/pump-events/:id */
  server.get(
    '/devices/infusion/pump-events/:id',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const ev = getPumpEvent(id);
      if (!ev) return reply.code(404).send({ ok: false, error: 'pump event not found' });
      return { ok: true, pumpEvent: ev };
    }
  );

  /** PATCH /devices/infusion/pump-events/:id/verify -- VistA verification */
  server.patch(
    '/devices/infusion/pump-events/:id/verify',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      const ev = updatePumpEventVerification(id, body.vistaVerified ?? true, body.vistaMahIen);
      if (!ev) return reply.code(404).send({ ok: false, error: 'pump event not found' });
      return { ok: true, pumpEvent: ev };
    }
  );

  // -----------------------------------------------------------------------
  // BCMA Sessions
  // -----------------------------------------------------------------------

  /** POST /devices/bcma/sessions -- start BCMA session */
  server.post('/devices/bcma/sessions', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.clinicianDuz) {
      return reply.code(400).send({ ok: false, error: 'clinicianDuz required' });
    }
    const session = createBcmaSession(tenant(req), body.clinicianDuz);
    return reply.code(201).send({ ok: true, bcmaSession: session });
  });

  /** GET /devices/bcma/sessions -- list */
  server.get('/devices/bcma/sessions', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as any;
    const sessions = listBcmaSessions(tenant(req), {
      clinicianDuz: q.clinicianDuz,
      status: q.status,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, count: sessions.length, bcmaSessions: sessions };
  });

  /** GET /devices/bcma/sessions/:id */
  server.get('/devices/bcma/sessions/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const session = getBcmaSession(id);
    if (!session) return reply.code(404).send({ ok: false, error: 'BCMA session not found' });
    return { ok: true, bcmaSession: session };
  });

  /** POST /devices/bcma/sessions/:id/patient-scan -- scan patient wristband */
  server.post(
    '/devices/bcma/sessions/:id/patient-scan',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      if (!body.barcodeData) {
        return reply.code(400).send({ ok: false, error: 'barcodeData required' });
      }
      const session = recordPatientScan(id, {
        barcodeData: body.barcodeData,
        patientDfn: body.patientDfn,
        patientName: body.patientName,
        scannerDeviceId: body.scannerDeviceId,
      });
      if (!session) return reply.code(404).send({ ok: false, error: 'BCMA session not found' });
      return { ok: true, bcmaSession: session };
    }
  );

  /** POST /devices/bcma/sessions/:id/medication-scan -- scan medication barcode */
  server.post(
    '/devices/bcma/sessions/:id/medication-scan',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      if (!body.barcodeData) {
        return reply.code(400).send({ ok: false, error: 'barcodeData required' });
      }
      const session = recordMedicationScan(id, {
        barcodeData: body.barcodeData,
        barcodeType: body.barcodeType || 'unknown',
        medicationName: body.medicationName,
        ndc: body.ndc,
        lotNumber: body.lotNumber,
        expirationDate: body.expirationDate,
        scannerDeviceId: body.scannerDeviceId,
      });
      if (!session) return reply.code(404).send({ ok: false, error: 'BCMA session not found' });
      return { ok: true, bcmaSession: session };
    }
  );

  /** POST /devices/bcma/sessions/:id/right6-check -- perform right-6 verification */
  server.post(
    '/devices/bcma/sessions/:id/right6-check',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      if (!body.patientDfn || !body.orderIen) {
        return reply.code(400).send({ ok: false, error: 'patientDfn and orderIen required' });
      }
      const result = performRight6Check(id, {
        patientDfn: body.patientDfn,
        medicationNdc: body.medicationNdc || '',
        orderedDose: body.orderedDose || '',
        orderedRoute: body.orderedRoute || '',
        scheduledTime: body.scheduledTime || new Date().toISOString(),
        orderIen: body.orderIen,
      });
      if (!result) return reply.code(404).send({ ok: false, error: 'BCMA session not found' });
      return { ok: true, right6Result: result };
    }
  );

  /** POST /devices/bcma/sessions/:id/complete -- complete session */
  server.post(
    '/devices/bcma/sessions/:id/complete',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as any;
      const body = (req.body as any) || {};
      const validStatuses = ['administered', 'refused', 'held'];
      if (!body.status || !validStatuses.includes(body.status)) {
        return reply
          .code(400)
          .send({ ok: false, error: `status must be one of: ${validStatuses.join(', ')}` });
      }
      const session = completeBcmaSession(id, body.status, body.notes, body.pumpEventId);
      if (!session) return reply.code(404).send({ ok: false, error: 'BCMA session not found' });
      return { ok: true, bcmaSession: session };
    }
  );

  // -----------------------------------------------------------------------
  // Stats & Audit
  // -----------------------------------------------------------------------

  /** GET /devices/infusion/stats */
  server.get('/devices/infusion/stats', async (req: FastifyRequest) => {
    return { ok: true, stats: getInfusionBcmaStats(tenant(req)) };
  });

  /** GET /devices/infusion/audit */
  server.get('/devices/infusion/audit', async (req: FastifyRequest) => {
    const q = req.query as any;
    const limit = q.limit ? Number(q.limit) : 200;
    return { ok: true, audit: getInfusionAudit(tenant(req), limit) };
  });
}
