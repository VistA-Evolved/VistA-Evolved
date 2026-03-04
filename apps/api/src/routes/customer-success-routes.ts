/**
 * Customer Success Routes (Phase 372 / W20-P3)
 *
 * Admin endpoints for tenant onboarding, training mode, demo environments.
 */

import type { FastifyInstance } from 'fastify';
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

const DEFAULT_TENANT = 'default';

function getTenantId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

export default async function customerSuccessRoutes(server: FastifyInstance): Promise<void> {
  /* ── Onboarding ─────────────────────────────────────────────── */

  server.post('/customer-success/onboard', async (request, reply) => {
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
    const { id } = request.params as any;
    const result = runOnboarding(id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.get('/customer-success/onboardings', async () => {
    return { ok: true, onboardings: listOnboardings() };
  });

  server.get('/customer-success/onboard/:id', async (request, reply) => {
    const { id } = request.params as any;
    const config = getOnboarding(id);
    if (!config) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: config };
  });

  /* ── Training Mode ──────────────────────────────────────────── */

  server.post('/customer-success/training/:id/enable', async (request, reply) => {
    const { id } = request.params as any;
    const result = enableTrainingMode(id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.post('/customer-success/training/:id/disable', async (request, reply) => {
    const { id } = request.params as any;
    const result = disableTrainingMode(id);
    if (!result) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, onboarding: result };
  });

  server.get('/customer-success/training/status', async (request) => {
    const tenantId = (request.query as any)?.tenantId || getTenantId(request);
    return { ok: true, ...getTrainingStatus(tenantId) };
  });

  /* ── Synthetic Data ─────────────────────────────────────────── */

  server.post('/customer-success/datasets/seed', async (request, reply) => {
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || getTenantId(request);
    const type = body.type || 'full_demo';
    const count = body.recordCount || 50;
    const ds = seedSyntheticDataset(tenantId, type, count);
    return reply.code(201).send({ ok: true, dataset: ds });
  });

  server.get('/customer-success/datasets', async (request) => {
    const tenantId = (request.query as any)?.tenantId || getTenantId(request);
    return { ok: true, datasets: listDatasets(tenantId) };
  });

  /* ── Demo Environments ──────────────────────────────────────── */

  server.post('/customer-success/demo', async (request, reply) => {
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || getTenantId(request);
    const name = body.name || 'Demo Environment';
    const hours = body.expiresInHours || 24;
    const env = createDemoEnvironment(tenantId, name, hours);
    return reply.code(201).send({ ok: true, environment: env });
  });

  server.get('/customer-success/demo', async (request) => {
    const tenantId = (request.query as any)?.tenantId || getTenantId(request);
    return { ok: true, environments: listDemoEnvironments(tenantId) };
  });

  server.get('/customer-success/demo/:id', async (request, reply) => {
    const { id } = request.params as any;
    const env = getDemoEnvironment(id);
    if (!env) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, environment: env };
  });

  server.delete('/customer-success/demo/:id', async (request, reply) => {
    const { id } = request.params as any;
    const env = destroyDemoEnvironment(id);
    if (!env) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, environment: env };
  });
}
