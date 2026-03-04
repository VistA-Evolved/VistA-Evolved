/**
 * Phase 394 (W22-P6): Imaging/Radiology Deep Workflows -- REST Routes
 *
 * Endpoints:
 *   GET  /radiology/orders                       -- List rad orders
 *   POST /radiology/orders                       -- Create rad order
 *   GET  /radiology/orders/:id                   -- Get single rad order
 *   POST /radiology/orders/:id/transition        -- Transition order status
 *   POST /radiology/orders/:id/protocol          -- Assign protocol
 *   POST /radiology/orders/:id/link-mwl          -- Link MWL item (W21 bridge)
 *   POST /radiology/orders/:id/link-mpps         -- Link MPPS record (W21 bridge)
 *   GET  /radiology/reading-worklist              -- Radiologist reading worklist
 *   POST /radiology/reading-worklist              -- Create reading worklist item
 *   POST /radiology/reading-worklist/:id/assign   -- Assign radiologist
 *   POST /radiology/reading-worklist/:id/transition -- Transition reading status
 *   GET  /radiology/reports                       -- List reports
 *   POST /radiology/reports                       -- Create report (dictation)
 *   GET  /radiology/reports/:id                   -- Get single report
 *   POST /radiology/reports/:id/transition        -- Transition report status
 *   GET  /radiology/dose-registry                 -- Dose registry entries
 *   POST /radiology/dose-registry                 -- Record dose
 *   GET  /radiology/dose-registry/patient-cumulative -- Patient cumulative dose
 *   GET  /radiology/critical-alerts               -- List critical alerts
 *   POST /radiology/critical-alerts               -- Create critical alert
 *   POST /radiology/critical-alerts/:id/communicate -- Record communication
 *   POST /radiology/critical-alerts/:id/ack       -- Acknowledge alert
 *   POST /radiology/critical-alerts/:id/resolve   -- Resolve alert
 *   GET  /radiology/peer-reviews                  -- List peer reviews
 *   POST /radiology/peer-reviews                  -- Create peer review
 *   GET  /radiology/dashboard                     -- Dashboard stats
 *   GET  /radiology/writeback-posture             -- Writeback posture
 *
 * Auth: session-based; admin for resolve endpoints.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createRadOrder,
  getRadOrder,
  listRadOrders,
  transitionRadOrder,
  assignProtocol,
  linkMwlToRadOrder,
  linkMppsToRadOrder,
  createReadingWorklistItem,
  listReadingWorklist,
  assignRadiologist,
  transitionReadingItem,
  createRadReport,
  getRadReport,
  listRadReports,
  transitionRadReport,
  recordDose,
  listDoseRegistry,
  getPatientCumulativeDose,
  createRadCriticalAlert,
  listRadCriticalAlerts,
  communicateRadCriticalAlert,
  acknowledgeRadCriticalAlert,
  resolveRadCriticalAlert,
  createPeerReview,
  listPeerReviews,
  getRadDashboardStats,
  getRadWritebackPosture,
} from './radiology-store.js';
import type {
  RadOrderStatus,
  RadPriority,
  RadModality,
  ReadingStatus,
  ReadingPriority,
  ReportStatus,
  RadCriticalAlertStatus,
  PeerReviewScore,
} from './types.js';

// -- Plugin --

export async function radiologyRoutes(server: FastifyInstance): Promise<void> {
  // == Rad Orders ==

  server.get('/radiology/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const orders = listRadOrders(session.tenantId ?? 'default', {
      patientDfn: q.dfn,
      status: q.status as RadOrderStatus | undefined,
      modality: q.modality as RadModality | undefined,
    });
    return { ok: true, orders };
  });

  server.post('/radiology/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.procedureName || !body.modality || !body.clinicalIndication) {
      return reply.code(400).send({
        ok: false,
        error: 'procedureName, modality, and clinicalIndication required',
      });
    }
    const order = createRadOrder({
      tenantId: session.tenantId ?? 'default',
      patientDfn: String(body.dfn ?? ''),
      procedureName: String(body.procedureName),
      procedureCode: body.procedureCode ? String(body.procedureCode) : undefined,
      cptCode: body.cptCode ? String(body.cptCode) : undefined,
      modality: body.modality as RadModality,
      priority: (body.priority as RadPriority) ?? undefined,
      clinicalIndication: String(body.clinicalIndication),
      orderingProviderDuz: session.duz,
      orderingProviderName: session.userName ?? session.duz,
      scheduledAt: body.scheduledAt ? String(body.scheduledAt) : undefined,
    });
    return reply.code(201).send({ ok: true, order });
  });

  server.get('/radiology/orders/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const order = getRadOrder(id);
    if (!order) return reply.code(404).send({ ok: false, error: 'Rad order not found' });
    return { ok: true, order };
  });

  server.post(
    '/radiology/orders/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.status) return reply.code(400).send({ ok: false, error: 'status required' });
      const result = transitionRadOrder(id, body.status as RadOrderStatus, {
        duz: session.duz,
        name: session.userName ?? session.duz,
      });
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, order: result.order };
    }
  );

  server.post(
    '/radiology/orders/:id/protocol',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.protocolName)
        return reply.code(400).send({ ok: false, error: 'protocolName required' });
      const result = assignProtocol(id, String(body.protocolName), session.duz);
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, order: result.order };
    }
  );

  server.post(
    '/radiology/orders/:id/link-mwl',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.mwlWorklistItemId)
        return reply.code(400).send({ ok: false, error: 'mwlWorklistItemId required' });
      const result = linkMwlToRadOrder(id, String(body.mwlWorklistItemId));
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true };
    }
  );

  server.post(
    '/radiology/orders/:id/link-mpps',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.mppsRecordId)
        return reply.code(400).send({ ok: false, error: 'mppsRecordId required' });
      const result = linkMppsToRadOrder(
        id,
        String(body.mppsRecordId),
        body.studyInstanceUid ? String(body.studyInstanceUid) : undefined
      );
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true };
    }
  );

  // == Reading Worklist ==

  server.get(
    '/radiology/reading-worklist',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const q = (request.query ?? {}) as Record<string, string>;
      const items = listReadingWorklist(session.tenantId ?? 'default', {
        status: q.status as ReadingStatus | undefined,
        assignedRadiologistDuz: q.radiologistDuz,
        modality: q.modality as RadModality | undefined,
        priority: q.priority as ReadingPriority | undefined,
      });
      return { ok: true, items };
    }
  );

  server.post(
    '/radiology/reading-worklist',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as Record<string, unknown>) ?? {};
      if (
        !body.radOrderId ||
        !body.studyInstanceUid ||
        !body.accessionNumber ||
        !body.modality ||
        !body.procedureName
      ) {
        return reply.code(400).send({
          ok: false,
          error:
            'radOrderId, studyInstanceUid, accessionNumber, modality, and procedureName required',
        });
      }
      const item = createReadingWorklistItem({
        tenantId: session.tenantId ?? 'default',
        radOrderId: String(body.radOrderId),
        patientDfn: String(body.dfn ?? ''),
        studyInstanceUid: String(body.studyInstanceUid),
        accessionNumber: String(body.accessionNumber),
        modality: body.modality as RadModality,
        procedureName: String(body.procedureName),
        priority: (body.priority as ReadingPriority) ?? undefined,
      });
      return reply.code(201).send({ ok: true, item });
    }
  );

  server.post(
    '/radiology/reading-worklist/:id/assign',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      const result = assignRadiologist(
        id,
        body.radiologistDuz ? String(body.radiologistDuz) : session.duz,
        body.radiologistName ? String(body.radiologistName) : (session.userName ?? session.duz)
      );
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, item: result.item };
    }
  );

  server.post(
    '/radiology/reading-worklist/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.status) return reply.code(400).send({ ok: false, error: 'status required' });
      const result = transitionReadingItem(id, body.status as ReadingStatus);
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, item: result.item };
    }
  );

  // == Reports ==

  server.get('/radiology/reports', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const reports = listRadReports(session.tenantId ?? 'default', {
      radOrderId: q.radOrderId,
      patientDfn: q.dfn,
      status: q.status as ReportStatus | undefined,
    });
    return { ok: true, reports };
  });

  server.post('/radiology/reports', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (
      !body.radOrderId ||
      !body.readingWorklistItemId ||
      !body.studyInstanceUid ||
      !body.accessionNumber ||
      !body.findings ||
      !body.impression
    ) {
      return reply.code(400).send({
        ok: false,
        error:
          'radOrderId, readingWorklistItemId, studyInstanceUid, accessionNumber, findings, and impression required',
      });
    }
    const report = createRadReport({
      tenantId: session.tenantId ?? 'default',
      radOrderId: String(body.radOrderId),
      readingWorklistItemId: String(body.readingWorklistItemId),
      patientDfn: String(body.dfn ?? ''),
      studyInstanceUid: String(body.studyInstanceUid),
      accessionNumber: String(body.accessionNumber),
      findings: String(body.findings),
      impression: String(body.impression),
      reportText: body.reportText ? String(body.reportText) : undefined,
      templateId: body.templateId ? String(body.templateId) : undefined,
      dictatedByDuz: session.duz,
      dictatedByName: session.userName ?? session.duz,
      criticalFinding: body.criticalFinding === true,
    });
    return reply.code(201).send({ ok: true, report });
  });

  server.get('/radiology/reports/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const report = getRadReport(id);
    if (!report) return reply.code(404).send({ ok: false, error: 'Rad report not found' });
    return { ok: true, report };
  });

  server.post(
    '/radiology/reports/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.status) return reply.code(400).send({ ok: false, error: 'status required' });
      const result = transitionRadReport(id, body.status as ReportStatus, {
        duz: session.duz,
        name: session.userName ?? session.duz,
      });
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, report: result.report };
    }
  );

  // == Dose Registry ==

  server.get('/radiology/dose-registry', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const entries = listDoseRegistry(session.tenantId ?? 'default', {
      patientDfn: q.dfn,
      modality: q.modality as RadModality | undefined,
      exceedsDrl: q.exceedsDrl === 'true' ? true : q.exceedsDrl === 'false' ? false : undefined,
    });
    return { ok: true, entries };
  });

  server.post('/radiology/dose-registry', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (
      !body.radOrderId ||
      !body.studyInstanceUid ||
      !body.accessionNumber ||
      !body.modality ||
      !body.procedureName
    ) {
      return reply.code(400).send({
        ok: false,
        error:
          'radOrderId, studyInstanceUid, accessionNumber, modality, and procedureName required',
      });
    }
    const entry = recordDose({
      tenantId: session.tenantId ?? 'default',
      patientDfn: String(body.dfn ?? ''),
      radOrderId: String(body.radOrderId),
      studyInstanceUid: String(body.studyInstanceUid),
      accessionNumber: String(body.accessionNumber),
      modality: body.modality as RadModality,
      procedureName: String(body.procedureName),
      ctdiVol: body.ctdiVol ? Number(body.ctdiVol) : undefined,
      dlp: body.dlp ? Number(body.dlp) : undefined,
      dap: body.dap ? Number(body.dap) : undefined,
      fluoroTimeSec: body.fluoroTimeSec ? Number(body.fluoroTimeSec) : undefined,
      exposureCount: body.exposureCount ? Number(body.exposureCount) : undefined,
      effectiveDoseMSv: body.effectiveDoseMSv ? Number(body.effectiveDoseMSv) : undefined,
      mppsRecordId: body.mppsRecordId ? String(body.mppsRecordId) : undefined,
    });
    return reply.code(201).send({ ok: true, entry });
  });

  server.get(
    '/radiology/dose-registry/patient-cumulative',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const q = (request.query ?? {}) as Record<string, string>;
      if (!q.dfn) return reply.code(400).send({ ok: false, error: 'dfn query param required' });
      const cumulative = getPatientCumulativeDose(session.tenantId ?? 'default', q.dfn);
      return { ok: true, cumulative };
    }
  );

  // == Critical Alerts ==

  server.get('/radiology/critical-alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const alerts = listRadCriticalAlerts(session.tenantId ?? 'default', {
      patientDfn: q.dfn,
      status: q.status as RadCriticalAlertStatus | undefined,
    });
    return { ok: true, alerts };
  });

  server.post(
    '/radiology/critical-alerts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.radReportId || !body.radOrderId || !body.finding || !body.category) {
        return reply.code(400).send({
          ok: false,
          error: 'radReportId, radOrderId, finding, and category required',
        });
      }
      const alert = createRadCriticalAlert({
        tenantId: session.tenantId ?? 'default',
        radReportId: String(body.radReportId),
        radOrderId: String(body.radOrderId),
        patientDfn: String(body.dfn ?? ''),
        finding: String(body.finding),
        category: body.category as 'unexpected' | 'urgent' | 'emergent',
        notifyProviderDuz: body.notifyProviderDuz ? String(body.notifyProviderDuz) : session.duz,
        notifyProviderName: body.notifyProviderName
          ? String(body.notifyProviderName)
          : (session.userName ?? session.duz),
      });
      return reply.code(201).send({ ok: true, alert });
    }
  );

  server.post(
    '/radiology/critical-alerts/:id/communicate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) ?? {};
      if (!body.method) return reply.code(400).send({ ok: false, error: 'method required' });
      const result = communicateRadCriticalAlert(
        id,
        { duz: session.duz, name: session.userName ?? session.duz },
        body.method as 'direct_verbal' | 'phone' | 'secure_message' | 'in_person'
      );
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, alert: result.alert };
    }
  );

  server.post(
    '/radiology/critical-alerts/:id/ack',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const result = acknowledgeRadCriticalAlert(id, {
        duz: session.duz,
        name: session.userName ?? session.duz,
      });
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, alert: result.alert };
    }
  );

  server.post(
    '/radiology/critical-alerts/:id/resolve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const result = resolveRadCriticalAlert(id);
      if (!result.ok) return reply.code(400).send(result);
      return { ok: true, alert: result.alert };
    }
  );

  // == Peer Reviews ==

  server.get('/radiology/peer-reviews', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const reviews = listPeerReviews(session.tenantId ?? 'default', {
      radReportId: q.radReportId,
      reviewerDuz: q.reviewerDuz,
      originalDictatorDuz: q.originalDictatorDuz,
    });
    return { ok: true, reviews };
  });

  server.post('/radiology/peer-reviews', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.radReportId || !body.radOrderId || body.score === undefined || !body.comments) {
      return reply.code(400).send({
        ok: false,
        error: 'radReportId, radOrderId, score, and comments required',
      });
    }
    const review = createPeerReview({
      tenantId: session.tenantId ?? 'default',
      radReportId: String(body.radReportId),
      radOrderId: String(body.radOrderId),
      patientDfn: String(body.dfn ?? ''),
      reviewerDuz: session.duz,
      reviewerName: session.userName ?? session.duz,
      originalDictatorDuz: String(body.originalDictatorDuz ?? ''),
      originalDictatorName: String(body.originalDictatorName ?? ''),
      score: Number(body.score) as PeerReviewScore,
      comments: String(body.comments),
      discrepancyCategory: body.discrepancyCategory ? String(body.discrepancyCategory) : undefined,
    });
    return reply.code(201).send({ ok: true, review });
  });

  // == Dashboard & Posture ==

  server.get('/radiology/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const stats = getRadDashboardStats(session.tenantId ?? 'default');
    return { ok: true, stats };
  });

  server.get(
    '/radiology/writeback-posture',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const posture = getRadWritebackPosture();
      return { ok: true, posture };
    }
  );
}
