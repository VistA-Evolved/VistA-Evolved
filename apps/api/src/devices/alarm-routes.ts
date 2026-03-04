/**
 * Device Alarms Pipeline — Routes
 *
 * Phase 384 (W21-P7): REST endpoints for alarm management including
 * creation, acknowledgment, escalation, routing rules, and audit.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createAlarm,
  getAlarm,
  listAlarms,
  updateAlarmState,
  acknowledgeAlarm,
  escalateAlarm,
  addRoutingRule,
  listRoutingRules,
  deleteRoutingRule,
  getAlarmStats,
  getAlarmAudit,
} from './alarm-store.js';
import type { AlarmPriority, AlarmSource, AlarmState } from './alarm-types.js';

const DEFAULT_TENANT = 'default';

function tenantId(request: FastifyRequest): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

export default async function alarmRoutes(server: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /devices/alarms — Create alarm
  // -------------------------------------------------------------------------
  server.post('/devices/alarms', async (request, reply) => {
    const tenant = tenantId(request);
    const body = request.body as any;

    if (!body?.deviceSerial || !body?.code || !body?.displayText || !body?.priority) {
      return reply.code(400).send({
        ok: false,
        error: 'Required: deviceSerial, code, displayText, priority',
      });
    }

    const validPriorities: AlarmPriority[] = ['low', 'medium', 'high', 'crisis'];
    if (!validPriorities.includes(body.priority)) {
      return reply
        .code(400)
        .send({ ok: false, error: 'priority must be: low, medium, high, crisis' });
    }

    const alarm = createAlarm(tenant, {
      deviceSerial: body.deviceSerial,
      gatewayId: body.gatewayId,
      code: body.code,
      codingSystem: body.codingSystem,
      displayText: body.displayText,
      priority: body.priority,
      source: (body.source as AlarmSource) || 'manual',
      patientId: body.patientId,
      location: body.location,
      triggerValue: body.triggerValue,
      triggerUnit: body.triggerUnit,
      threshold: body.threshold,
      metadata: body.metadata,
    });

    return reply.code(201).send({ ok: true, alarm });
  });

  // -------------------------------------------------------------------------
  // GET /devices/alarms — List alarms (with optional filters)
  // -------------------------------------------------------------------------
  server.get('/devices/alarms', async (request, reply) => {
    const tenant = tenantId(request);
    const q = request.query as any;
    const filters: any = {};
    if (q.state) filters.state = q.state as AlarmState;
    if (q.priority) filters.priority = q.priority as AlarmPriority;
    if (q.deviceSerial) filters.deviceSerial = q.deviceSerial;
    if (q.patientId) filters.patientId = q.patientId;

    const result = listAlarms(tenant, filters);
    return reply.send({ ok: true, alarms: result, count: result.length });
  });

  // -------------------------------------------------------------------------
  // GET /devices/alarms/stats — Alarm statistics
  // -------------------------------------------------------------------------
  server.get('/devices/alarms/stats', async (request, reply) => {
    const tenant = tenantId(request);
    return reply.send({ ok: true, stats: getAlarmStats(tenant) });
  });

  // -------------------------------------------------------------------------
  // GET /devices/alarms/:id — Get single alarm
  // -------------------------------------------------------------------------
  server.get('/devices/alarms/:id', async (request, reply) => {
    const tenant = tenantId(request);
    const { id } = request.params as any;
    const alarm = getAlarm(tenant, id);
    if (!alarm) return reply.code(404).send({ ok: false, error: 'Alarm not found' });
    return reply.send({ ok: true, alarm });
  });

  // -------------------------------------------------------------------------
  // POST /devices/alarms/:id/acknowledge — Acknowledge alarm
  // -------------------------------------------------------------------------
  server.post('/devices/alarms/:id/acknowledge', async (request, reply) => {
    const tenant = tenantId(request);
    const { id } = request.params as any;
    const body = request.body as any;

    if (!body?.userId) {
      return reply.code(400).send({ ok: false, error: 'Required: userId' });
    }

    const ack = acknowledgeAlarm(
      tenant,
      id,
      body.userId,
      body.reason,
      body.silencesEscalation !== false
    );
    if (!ack) return reply.code(404).send({ ok: false, error: 'Alarm not found' });
    return reply.send({ ok: true, acknowledgment: ack });
  });

  // -------------------------------------------------------------------------
  // POST /devices/alarms/:id/escalate — Escalate alarm
  // -------------------------------------------------------------------------
  server.post('/devices/alarms/:id/escalate', async (request, reply) => {
    const tenant = tenantId(request);
    const { id } = request.params as any;
    const body = (request.body as any) || {};

    const alarm = escalateAlarm(tenant, id, body.target);
    if (!alarm) return reply.code(404).send({ ok: false, error: 'Alarm not found' });
    return reply.send({ ok: true, alarm });
  });

  // -------------------------------------------------------------------------
  // PATCH /devices/alarms/:id/state — Update alarm state
  // -------------------------------------------------------------------------
  server.patch('/devices/alarms/:id/state', async (request, reply) => {
    const tenant = tenantId(request);
    const { id } = request.params as any;
    const body = request.body as any;

    const validStates: AlarmState[] = [
      'active',
      'latched',
      'acknowledged',
      'resolved',
      'escalated',
    ];
    if (!body?.state || !validStates.includes(body.state)) {
      return reply.code(400).send({
        ok: false,
        error: 'Required: state (active|latched|acknowledged|resolved|escalated)',
      });
    }

    const alarm = updateAlarmState(tenant, id, body.state, body.actor);
    if (!alarm) return reply.code(404).send({ ok: false, error: 'Alarm not found' });
    return reply.send({ ok: true, alarm });
  });

  // -------------------------------------------------------------------------
  // POST /devices/alarms/routing-rules — Create routing rule
  // -------------------------------------------------------------------------
  server.post('/devices/alarms/routing-rules', async (request, reply) => {
    const tenant = tenantId(request);
    const body = request.body as any;

    if (!body?.name || !Array.isArray(body.notifyTargets)) {
      return reply.code(400).send({ ok: false, error: 'Required: name, notifyTargets[]' });
    }

    const rule = addRoutingRule(tenant, {
      name: body.name,
      codePattern: body.codePattern,
      minPriority: body.minPriority,
      devicePattern: body.devicePattern,
      locationPattern: body.locationPattern,
      notifyTargets: body.notifyTargets,
      autoEscalateAfterSec: body.autoEscalateAfterSec,
      escalationChain: body.escalationChain,
      enabled: body.enabled !== false,
      rulePriority: body.rulePriority || 100,
    });

    return reply.code(201).send({ ok: true, rule });
  });

  // -------------------------------------------------------------------------
  // GET /devices/alarms/routing-rules — List routing rules
  // -------------------------------------------------------------------------
  server.get('/devices/alarms/routing-rules', async (request, reply) => {
    const tenant = tenantId(request);
    const rules = listRoutingRules(tenant);
    return reply.send({ ok: true, rules, count: rules.length });
  });

  // -------------------------------------------------------------------------
  // DELETE /devices/alarms/routing-rules/:id — Delete routing rule
  // -------------------------------------------------------------------------
  server.delete('/devices/alarms/routing-rules/:id', async (request, reply) => {
    const tenant = tenantId(request);
    const { id } = request.params as any;
    const deleted = deleteRoutingRule(tenant, id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Rule not found' });
    return reply.send({ ok: true, deleted: true });
  });

  // -------------------------------------------------------------------------
  // GET /devices/alarms/audit — Alarm audit trail
  // -------------------------------------------------------------------------
  server.get('/devices/alarms/audit', async (request, reply) => {
    const tenant = tenantId(request);
    const q = request.query as any;
    const limit = parseInt(q.limit as string, 10) || 100;
    const entries = getAlarmAudit(tenant, limit);
    return reply.send({ ok: true, entries, count: entries.length });
  });
}
