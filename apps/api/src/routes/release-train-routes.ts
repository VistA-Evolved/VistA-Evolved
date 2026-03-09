/**
 * Release Train Governance Routes (Phase 371 / W20-P2)
 *
 * Admin-only endpoints for release calendar, approval workflow,
 * canary deployments, comms templates, and maintenance notifications.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  createChangeWindow,
  listChangeWindows,
  getChangeWindow,
  updateChangeWindow,
  deleteChangeWindow,
  scheduleRelease,
  listReleases,
  getRelease,
  requestApproval,
  approveRelease,
  rejectRelease,
  deployCanary,
  activateCanary,
  promoteRelease,
  completePromotion,
  rollbackRelease,
  completeRollback,
  cancelRelease,
  getApprovals,
  createCommsTemplate,
  listCommsTemplates,
  getCommsTemplate,
  updateCommsTemplate,
  deleteCommsTemplate,
  sendMaintenanceNotification,
  listNotifications,
  simulateReleaseCycle,
} from '../services/release-train-service.js';

function getTenantId(request: FastifyRequest): string | null {
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

function requireTenantId(request: FastifyRequest, reply: any): string | null {
  const tenantId = getTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function getActor(request: FastifyRequest): string {
  return request.session?.userName || request.session?.duz || 'unknown';
}

export default async function releaseTrainRoutes(server: FastifyInstance): Promise<void> {
  /* ── Change Windows ─────────────────────────────────────────── */

  server.post('/release-train/change-windows', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.name || !body.schedule || !body.durationMinutes) {
      return reply.code(400).send({ ok: false, error: 'name, schedule, durationMinutes required' });
    }
    const w = createChangeWindow(tenantId, body);
    return reply.code(201).send({ ok: true, changeWindow: w });
  });

  server.get('/release-train/change-windows', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, changeWindows: listChangeWindows(tenantId) };
  });

  server.get('/release-train/change-windows/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const w = getChangeWindow(id, tenantId);
    if (!w) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, changeWindow: w };
  });

  server.patch('/release-train/change-windows/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const existing = getChangeWindow(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const w = updateChangeWindow(tenantId, id, body);
    if (!w) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, changeWindow: w };
  });

  server.delete('/release-train/change-windows/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getChangeWindow(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    if (!deleteChangeWindow(tenantId, id)) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true };
  });

  /* ── Releases ───────────────────────────────────────────────── */

  server.post('/release-train/releases', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.version || !body.title) {
      return reply.code(400).send({ ok: false, error: 'version and title required' });
    }
    const r = scheduleRelease(tenantId, {
      ...body,
      requestedBy: getActor(request),
    });
    return reply.code(201).send({ ok: true, release: r });
  });

  server.get('/release-train/releases', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, releases: listReleases(tenantId) };
  });

  server.get('/release-train/releases/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const r = getRelease(id, tenantId);
    if (!r) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/request-approval', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = requestApproval(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/approve', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const result = approveRelease(tenantId, id, getActor(request), body.reason || '');
    if (!result) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: result.release, approval: result.approval };
  });

  server.post('/release-train/releases/:id/reject', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const result = rejectRelease(tenantId, id, getActor(request), body.reason || '');
    if (!result) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: result.release, approval: result.approval };
  });

  server.post('/release-train/releases/:id/deploy-canary', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = deployCanary(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/activate-canary', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = activateCanary(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/promote', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = promoteRelease(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/complete-promotion', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = completePromotion(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/rollback', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = rollbackRelease(tenantId, id, body.reason || 'Rollback requested');
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/complete-rollback', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = completeRollback(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.post('/release-train/releases/:id/cancel', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getRelease(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const r = cancelRelease(tenantId, id);
    if (!r) return reply.code(400).send({ ok: false, error: 'invalid transition' });
    return { ok: true, release: r };
  });

  server.get('/release-train/releases/:id/approvals', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const release = getRelease(id, tenantId);
    if (!release) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    return { ok: true, approvals: getApprovals(id, tenantId) };
  });

  /* ── Comms Templates ────────────────────────────────────────── */

  server.post('/release-train/comms-templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.name || !body.channel || !body.subject || !body.body || !body.trigger) {
      return reply
        .code(400)
        .send({ ok: false, error: 'name, channel, subject, body, trigger required' });
    }
    const t = createCommsTemplate(tenantId, body);
    return reply.code(201).send({ ok: true, template: t });
  });

  server.get('/release-train/comms-templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, templates: listCommsTemplates(tenantId) };
  });

  server.get('/release-train/comms-templates/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const t = getCommsTemplate(id, tenantId);
    if (!t) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, template: t };
  });

  server.patch('/release-train/comms-templates/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const existing = getCommsTemplate(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const t = updateCommsTemplate(tenantId, id, body);
    if (!t) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, template: t };
  });

  server.delete('/release-train/comms-templates/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as any;
    const existing = getCommsTemplate(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    if (!deleteCommsTemplate(tenantId, id)) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true };
  });

  /* ── Notifications ──────────────────────────────────────────── */

  server.post('/release-train/notifications', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.releaseId || !body.templateId) {
      return reply.code(400).send({ ok: false, error: 'releaseId, templateId required' });
    }
    const release = getRelease(body.releaseId, tenantId);
    const template = getCommsTemplate(body.templateId, tenantId);
    if (!release || !template) {
      return reply.code(400).send({ ok: false, error: 'template or release not found' });
    }
    const n = sendMaintenanceNotification(tenantId, body.releaseId, body.templateId);
    if (!n) return reply.code(400).send({ ok: false, error: 'template or release not found' });
    return reply.code(201).send({ ok: true, notification: n });
  });

  server.get('/release-train/notifications', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, notifications: listNotifications(tenantId) };
  });

  /* ── Simulation ─────────────────────────────────────────────── */

  server.post('/release-train/simulate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const result = simulateReleaseCycle(tenantId, getActor(request));
    return { ok: true, simulation: result };
  });
}
