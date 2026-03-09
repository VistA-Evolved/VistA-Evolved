/**
 * External Validation Routes (Phase 374 / W20-P5)
 *
 * Admin endpoints for external validation harness:
 * - Vulnerability triage workflow
 * - Endpoint inventory generation
 * - Scope document generation
 * - Vulnerability summary dashboard
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  submitVulnerability,
  assessVulnerability,
  triageVulnerability,
  getVulnerability,
  listVulnerabilities,
  generateEndpointInventory,
  generateScopeDocument,
  getVulnSummary,
} from '../services/external-validation-service.js';
import type { VulnSeverity } from '../services/external-validation-service.js';

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

export default async function externalValidationRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Vulnerabilities                                                */
  /* ============================================================= */

  server.post('/external-validation/vulnerabilities', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.title || !body.description || !body.severity) {
      return reply
        .code(400)
        .send({ ok: false, error: 'title, description, and severity required' });
    }
    const vuln = submitVulnerability(tenantId, {
      title: body.title as string,
      description: body.description as string,
      severity: body.severity as VulnSeverity,
      reportedBy: getActor(request),
      cveId: body.cveId as string | undefined,
      cweName: body.cweName as string | undefined,
      affectedEndpoint: body.affectedEndpoint as string | undefined,
    });
    return reply.code(201).send({ ok: true, vulnerability: vuln });
  });

  server.get('/external-validation/vulnerabilities', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const vulns = listVulnerabilities(tenantId, q.severity as VulnSeverity | undefined);
    return reply.send({ ok: true, vulnerabilities: vulns, count: vulns.length });
  });

  server.get('/external-validation/vulnerabilities/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const vuln = getVulnerability(id, tenantId);
    if (!vuln) {
      return reply.code(404).send({ ok: false, error: 'Vulnerability not found' });
    }
    return reply.send({ ok: true, vulnerability: vuln });
  });

  server.post('/external-validation/vulnerabilities/:id/triage', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getVulnerability(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Vulnerability not found' });
    }
    const vuln = triageVulnerability(tenantId, id, getActor(request));
    if (!vuln) return reply.code(400).send({ ok: false, error: 'Cannot triage vulnerability' });
    return reply.send({ ok: true, vulnerability: vuln });
  });

  server.post('/external-validation/vulnerabilities/:id/assess', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getVulnerability(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Vulnerability not found' });
    }
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: 'status required' });
    }
    const vuln = assessVulnerability(tenantId, id, {
      status: body.status as 'accepted' | 'rejected' | 'mitigated' | 'false_positive',
      assessedBy: getActor(request),
      notes: body.notes as string | undefined,
      mitigationPlan: body.mitigationPlan as string | undefined,
    });
    if (!vuln) return reply.code(404).send({ ok: false, error: 'Vulnerability not found' });
    return reply.send({ ok: true, vulnerability: vuln });
  });

  /* ============================================================= */
  /* Endpoint Inventory                                             */
  /* ============================================================= */

  server.get('/external-validation/endpoint-inventory', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const endpoints = generateEndpointInventory();
    return reply.send({ ok: true, endpoints, count: endpoints.length, scope: 'platform-global' });
  });

  /* ============================================================= */
  /* Scope Document                                                 */
  /* ============================================================= */

  server.get('/external-validation/scope-document', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const doc = generateScopeDocument(tenantId);
    return reply.send({ ok: true, scopeDocument: doc });
  });

  /* ============================================================= */
  /* Summary                                                        */
  /* ============================================================= */

  server.get('/external-validation/summary', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const summary = getVulnSummary(tenantId);
    return reply.send({ ok: true, summary });
  });
}
