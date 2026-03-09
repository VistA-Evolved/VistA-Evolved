/**
 * GA Evidence Routes (Phase 377 / W20-P8)
 *
 * Admin endpoints for GA evidence bundle and trust center export:
 * - Evidence bundle generation and retrieval
 * - Trust center export generation
 * - GA readiness status overview
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  generateEvidenceBundle,
  getEvidenceBundle,
  listEvidenceBundles,
  generateTrustCenterExport,
  getTrustCenterExport,
  listTrustCenterExports,
  getGaReadinessStatus,
} from '../services/ga-evidence-service.js';

function getTenantId(request: any, session: any): string | null {
  const sessionTenantId =
    typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
      ? session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
      ? request.tenantId.trim()
      : undefined;
  const headerTenantId = request?.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || headerTenant || null;
}

function requireTenantId(request: any, reply: any, session: any): string | null {
  const tenantId = getTenantId(request, session);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export default async function gaEvidenceRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Evidence Bundles                                               */
  /* ============================================================= */

  server.post('/ga/evidence/bundle', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const bundle = generateEvidenceBundle(tenantId);
    return reply.code(201).send({ ok: true, bundle });
  });

  server.get('/ga/evidence/bundles', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const bundles = listEvidenceBundles(tenantId);
    return reply.send({ ok: true, bundles, count: bundles.length });
  });

  server.get('/ga/evidence/bundle/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const bundle = getEvidenceBundle(id);
    if (!bundle || bundle.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Bundle not found' });
    }
    return reply.send({ ok: true, bundle });
  });

  /* ============================================================= */
  /* Trust Center Exports                                           */
  /* ============================================================= */

  server.post('/ga/evidence/trust-center', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const exp = generateTrustCenterExport(tenantId);
    return reply.code(201).send({ ok: true, export: exp });
  });

  server.get('/ga/evidence/trust-center/exports', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const exports = listTrustCenterExports(tenantId);
    return reply.send({ ok: true, exports, count: exports.length });
  });

  server.get('/ga/evidence/trust-center/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const exp = getTrustCenterExport(id);
    if (!exp || exp.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Export not found' });
    }
    return reply.send({ ok: true, export: exp });
  });

  /* ============================================================= */
  /* GA Status                                                      */
  /* ============================================================= */

  server.get('/ga/evidence/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const status = getGaReadinessStatus(tenantId);
    return reply.send({ ok: true, ...status });
  });
}
