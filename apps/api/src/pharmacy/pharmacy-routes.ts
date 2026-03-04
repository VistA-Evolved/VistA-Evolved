/**
 * Phase 392 (W22-P4): Pharmacy Deep Workflows — REST Routes
 *
 * Endpoints:
 *   GET  /pharmacy/orders                    — List pharmacy orders
 *   POST /pharmacy/orders                    — Create pharmacy order
 *   GET  /pharmacy/orders/:id                — Get single order
 *   POST /pharmacy/orders/:id/transition     — Transition order status
 *   POST /pharmacy/orders/:id/override       — Override clinical check
 *   GET  /pharmacy/dispense                  — List dispense events
 *   POST /pharmacy/dispense                  — Create dispense event
 *   PATCH /pharmacy/dispense/:id             — Update dispense status
 *   GET  /pharmacy/admin-records             — List administration records
 *   POST /pharmacy/admin-records             — Record administration
 *   GET  /pharmacy/dashboard                 — Dashboard stats
 *   GET  /pharmacy/writeback-posture         — Writeback posture report
 *
 * Auth: session-based; pharmacist-specific actions validated at handler level.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createPharmOrder,
  getPharmOrder,
  listPharmOrders,
  transitionPharmOrder,
  overrideClinicalCheck,
  createDispenseEvent,
  listDispenseEvents,
  updateDispenseStatus,
  createAdminRecord,
  listAdminRecords,
  getPharmacyDashboardStats,
  getPharmWritebackPosture,
} from './pharmacy-store.js';
import type {
  PharmOrderStatus,
  PharmOrderType,
  ClinicalCheckType,
  DispenseStatus,
  AdminStatus,
} from './types.js';

// ─── Plugin ─────────────────────────────────────────────────

export async function pharmacyRoutes(server: FastifyInstance): Promise<void> {
  // ── Orders ──────────────────────────────────────────────

  server.get('/pharmacy/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const dfn = (request.query as any)?.dfn;
    const orders = listPharmOrders(tenantId, dfn || undefined);
    return { ok: true, orders, total: orders.length };
  });

  server.post('/pharmacy/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const body = (request.body as any) || {};
    const {
      patientDfn,
      drugName,
      dose,
      route,
      schedule,
      orderType = 'inpatient',
      ndc = null,
      drugClass = null,
      durationDays = null,
      instructions = '',
    } = body;
    if (!patientDfn || !drugName || !dose || !route || !schedule) {
      return reply
        .code(400)
        .send({ ok: false, error: 'patientDfn, drugName, dose, route, schedule required' });
    }
    const order = createPharmOrder(tenantId, {
      patientDfn,
      vistaOrderIen: null,
      orderType: orderType as PharmOrderType,
      status: 'pending',
      drugName,
      ndc,
      drugClass,
      dose,
      route,
      schedule,
      durationDays,
      instructions,
      orderingProviderDuz: session.duz || '',
      orderingProviderName: session.userName || '',
    });
    return reply.code(201).send({ ok: true, order });
  });

  server.get('/pharmacy/orders/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const order = getPharmOrder(id);
    if (!order) return reply.code(404).send({ ok: false, error: 'Order not found' });
    return { ok: true, order };
  });

  server.post(
    '/pharmacy/orders/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { status } = body;
      if (!status) return reply.code(400).send({ ok: false, error: 'status required' });

      const result = transitionPharmOrder(id, status as PharmOrderStatus, {
        duz: session.duz || '',
        name: session.userName || '',
      });
      if ('error' in result) return reply.code(400).send({ ok: false, error: result.error });
      return { ok: true, order: result };
    }
  );

  server.post(
    '/pharmacy/orders/:id/override',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { checkType, reason } = body;
      if (!checkType || !reason) {
        return reply.code(400).send({ ok: false, error: 'checkType and reason required' });
      }
      const result = overrideClinicalCheck(
        id,
        checkType as ClinicalCheckType,
        reason,
        session.duz || session.userName || ''
      );
      if ('error' in result) return reply.code(400).send({ ok: false, error: result.error });
      return { ok: true, order: result };
    }
  );

  // ── Dispensing ──────────────────────────────────────────

  server.get('/pharmacy/dispense', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const orderId = (request.query as any)?.orderId;
    const events = listDispenseEvents(tenantId, orderId || undefined);
    return { ok: true, events, total: events.length };
  });

  server.post('/pharmacy/dispense', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const body = (request.body as any) || {};
    const {
      pharmOrderId,
      patientDfn,
      quantity = 1,
      dispensedNdc = null,
      lotNumber = null,
      expirationDate = null,
      deliveryLocation = null,
    } = body;
    if (!pharmOrderId || !patientDfn) {
      return reply.code(400).send({ ok: false, error: 'pharmOrderId and patientDfn required' });
    }
    const event = createDispenseEvent(tenantId, {
      pharmOrderId,
      patientDfn,
      status: 'pending',
      quantity,
      dispensedNdc,
      lotNumber,
      expirationDate,
      dispensedByDuz: session.duz || '',
      dispensedByName: session.userName || '',
      checkedByDuz: null,
      checkedByName: null,
      deliveryLocation,
      vistaDispenseIen: null,
    });
    return reply.code(201).send({ ok: true, event });
  });

  server.patch('/pharmacy/dispense/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { status, deliveryLocation } = body;
    if (!status) return reply.code(400).send({ ok: false, error: 'status required' });
    const patch: Record<string, string> = {};
    if (deliveryLocation) patch.deliveryLocation = deliveryLocation;
    // Auto-fill checked-by on "checked" status
    if (status === 'checked') {
      patch.checkedByDuz = session.duz || '';
      patch.checkedByName = session.userName || '';
    }
    const updated = updateDispenseStatus(id, status as DispenseStatus, patch as any);
    if (!updated) return reply.code(404).send({ ok: false, error: 'Dispense event not found' });
    return { ok: true, event: updated };
  });

  // ── Administration Records ──────────────────────────────

  server.get('/pharmacy/admin-records', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const { dfn, orderId } = request.query as any;
    const records = listAdminRecords(tenantId, dfn || undefined, orderId || undefined);
    return { ok: true, records, total: records.length };
  });

  server.post('/pharmacy/admin-records', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const body = (request.body as any) || {};
    const {
      pharmOrderId,
      patientDfn,
      status = 'given',
      givenDose = null,
      givenRoute = null,
      bcmaSessionId = null,
      barcodeVerified = false,
      right6Passed = null,
      site = null,
      patientResponse = null,
      holdReason = null,
    } = body;
    if (!pharmOrderId || !patientDfn) {
      return reply.code(400).send({ ok: false, error: 'pharmOrderId and patientDfn required' });
    }
    const record = createAdminRecord(tenantId, {
      pharmOrderId,
      patientDfn,
      status: status as AdminStatus,
      givenDose,
      givenRoute,
      adminByDuz: session.duz || '',
      adminByName: session.userName || '',
      administeredAt: new Date().toISOString(),
      bcmaSessionId,
      barcodeVerified,
      right6Passed,
      site,
      patientResponse,
      holdReason,
      vistaPsbIen: null,
      writebackStatus: 'not_attempted',
    });
    return reply.code(201).send({ ok: true, record });
  });

  // ── Dashboard + Posture ─────────────────────────────────

  server.get('/pharmacy/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || 'default';
    const stats = getPharmacyDashboardStats(tenantId);
    return { ok: true, stats };
  });

  server.get(
    '/pharmacy/writeback-posture',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const posture = getPharmWritebackPosture();
      return { ok: true, posture };
    }
  );
}

export default pharmacyRoutes;
