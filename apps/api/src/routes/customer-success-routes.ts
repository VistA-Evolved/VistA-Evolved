/**
 * Customer Success Routes (Phase 372 / W20-P3)
 *
 * Admin endpoints for tenant onboarding, training mode, demo environments.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  startOnboarding,
  runOnboarding,
  getOnboarding,
  listOnboardings,
  enableTrainingMode,
  disableTrainingMode,
  getTrainingStatus,
  seedSyntheticDataset,
  listDatasets,
  createDemoEnvironment,
  getDemoEnvironment,
  listDemoEnvironments,
  destroyDemoEnvironment,
} from '../services/customer-success-service.js';

function getSessionTenantId(request: FastifyRequest): string | null {
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

function resolveAdminTargetTenant(
  request: FastifyRequest,
  reply: FastifyReply,
  explicitTenantId?: string,
  reason?: string
): string | undefined {
  const sessionTenantId = getSessionTenantId(request);
  if (!sessionTenantId && (!explicitTenantId || !`${explicitTenantId}`.trim())) {
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return undefined;
  }
  const targetTenantId =
    typeof explicitTenantId === 'string' && explicitTenantId.trim().length > 0
      ? explicitTenantId.trim()
      : sessionTenantId;
  if (!targetTenantId) {
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return undefined;
  }
  if (sessionTenantId && targetTenantId !== sessionTenantId && (!reason || !reason.trim())) {
    reply.code(400).send({
      ok: false,
      error: 'reason is required for cross-tenant customer-success actions',
    });
    return undefined;
  }
  return targetTenantId;
}

export default async function customerSuccessRoutes(server: FastifyInstance): Promise<void> {
  /* -- Onboarding ----------------------------------------------- */

  server.post('/customer-success/onboard', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as any) || {};
    if (!body.tenantName || !body.pack || !body.country || !body.region) {
      return reply
        .code(400)
        .send({ ok: false, error: 'tenantName, pack, country, region required' });
    }
    const config = startOnboarding(body);
    return reply.code(201).send({ ok: true, onboarding: config });
  });

  server.post('/customer-success/onboard/:id/run', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const existing = getOnboarding(id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const result = runOnboarding(existing.tenantId, id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.get('/customer-success/onboardings', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const q = (request.query as any) || {};
    const tenantId =
      typeof q.tenantId === 'string' && q.tenantId.trim().length > 0 ? q.tenantId.trim() : undefined;
    const filtered = tenantId
      ? listOnboardings().filter((onboarding) => onboarding.tenantId === tenantId)
      : listOnboardings();
    return {
      ok: true,
      onboardings: filtered,
      scope: tenantId ? 'tenant-filtered' : 'platform-global',
    };
  });

  server.get('/customer-success/onboard/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const config = getOnboarding(id);
    if (!config) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    return { ok: true, onboarding: config };
  });

  /* -- Training Mode -------------------------------------------- */

  server.post('/customer-success/training/:id/enable', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const existing = getOnboarding(id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const result = enableTrainingMode(existing.tenantId, id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.post('/customer-success/training/:id/disable', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const existing = getOnboarding(id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const result = disableTrainingMode(existing.tenantId, id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.get('/customer-success/training/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const q = (request.query as any) || {};
    const tenantId = resolveAdminTargetTenant(request, reply, q.tenantId, q.reason);
    if (!tenantId) return;
    return { ok: true, ...getTrainingStatus(tenantId) };
  });

  /* -- Synthetic Data ------------------------------------------- */

  server.post('/customer-success/datasets/seed', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as any) || {};
    const tenantId = resolveAdminTargetTenant(request, reply, body.tenantId, body.reason);
    if (!tenantId) return;
    const type = body.type || 'full_demo';
    const count = body.recordCount || 50;
    const ds = seedSyntheticDataset(tenantId, type, count);
    return reply.code(201).send({ ok: true, dataset: ds });
  });

  server.get('/customer-success/datasets', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const q = (request.query as any) || {};
    const tenantId = resolveAdminTargetTenant(request, reply, q.tenantId, q.reason);
    if (!tenantId) return;
    return { ok: true, datasets: listDatasets(tenantId) };
  });

  /* -- Demo Environments ---------------------------------------- */

  server.post('/customer-success/demo', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as any) || {};
    const tenantId = resolveAdminTargetTenant(request, reply, body.tenantId, body.reason);
    if (!tenantId) return;
    const name = body.name || 'Demo Environment';
    const hours = body.expiresInHours || 24;
    const env = createDemoEnvironment(tenantId, name, hours);
    return reply.code(201).send({ ok: true, environment: env });
  });

  server.get('/customer-success/demo', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const q = (request.query as any) || {};
    const tenantId = resolveAdminTargetTenant(request, reply, q.tenantId, q.reason);
    if (!tenantId) return;
    return { ok: true, environments: listDemoEnvironments(tenantId) };
  });

  server.get('/customer-success/demo/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const env = getDemoEnvironment(id);
    if (!env) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    return { ok: true, environment: env };
  });

  server.delete('/customer-success/demo/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { id } = request.params as any;
    const existing = getDemoEnvironment(id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'not found' });
    }
    const env = destroyDemoEnvironment(existing.tenantId, id);
    if (!env) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, environment: env };
  });
}
