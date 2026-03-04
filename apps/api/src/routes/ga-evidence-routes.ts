/**
 * GA Evidence Routes (Phase 377 / W20-P8)
 *
 * Admin endpoints for GA evidence bundle and trust center export:
 * - Evidence bundle generation and retrieval
 * - Trust center export generation
 * - GA readiness status overview
 */

import type { FastifyInstance } from 'fastify';
import {
  generateEvidenceBundle,
  getEvidenceBundle,
  listEvidenceBundles,
  generateTrustCenterExport,
  getTrustCenterExport,
  listTrustCenterExports,
  getGaReadinessStatus,
} from '../services/ga-evidence-service.js';

const DEFAULT_TENANT = 'default';

function getTenantId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

export default async function gaEvidenceRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Evidence Bundles                                               */
  /* ============================================================= */

  server.post('/ga/evidence/bundle', async (request, reply) => {
    const tenantId = getTenantId(request);
    const bundle = generateEvidenceBundle(tenantId);
    return reply.code(201).send({ ok: true, bundle });
  });

  server.get('/ga/evidence/bundles', async (request, reply) => {
    const tenantId = getTenantId(request);
    const bundles = listEvidenceBundles(tenantId);
    return reply.send({ ok: true, bundles, count: bundles.length });
  });

  server.get('/ga/evidence/bundle/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const bundle = getEvidenceBundle(id);
    if (!bundle) return reply.code(404).send({ ok: false, error: 'Bundle not found' });
    return reply.send({ ok: true, bundle });
  });

  /* ============================================================= */
  /* Trust Center Exports                                           */
  /* ============================================================= */

  server.post('/ga/evidence/trust-center', async (request, reply) => {
    const tenantId = getTenantId(request);
    const exp = generateTrustCenterExport(tenantId);
    return reply.code(201).send({ ok: true, export: exp });
  });

  server.get('/ga/evidence/trust-center/exports', async (request, reply) => {
    const tenantId = getTenantId(request);
    const exports = listTrustCenterExports(tenantId);
    return reply.send({ ok: true, exports, count: exports.length });
  });

  server.get('/ga/evidence/trust-center/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const exp = getTrustCenterExport(id);
    if (!exp) return reply.code(404).send({ ok: false, error: 'Export not found' });
    return reply.send({ ok: true, export: exp });
  });

  /* ============================================================= */
  /* GA Status                                                      */
  /* ============================================================= */

  server.get('/ga/evidence/status', async (request, reply) => {
    const tenantId = getTenantId(request);
    const status = getGaReadinessStatus(tenantId);
    return reply.send({ ok: true, ...status });
  });
}
