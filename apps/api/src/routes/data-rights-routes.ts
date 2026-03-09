/**
 * Data Rights Routes (Phase 375 / W20-P6)
 *
 * Admin endpoints for data rights operations:
 * - Retention policy CRUD
 * - Deletion request lifecycle
 * - Legal hold management
 * - Data rights audit trail
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  createRetentionPolicy,
  listRetentionPolicies,
  getRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  createDeletionRequest,
  approveDeletionRequest,
  rejectDeletionRequest,
  executeDeletionRequest,
  verifyDeletionRequest,
  getDeletionRequest,
  listDeletionRequests,
  createLegalHold,
  releaseLegalHold,
  getLegalHold,
  listLegalHolds,
  getDataRightsAudit,
  verifyDataRightsAuditChain,
  getDataRightsSummary,
} from '../services/data-rights-service.js';
import type {
  DataClass,
  RetentionAction,
  DeletionStatus,
  LegalHoldStatus,
} from '../services/data-rights-service.js';

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

export default async function dataRightsRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Retention Policies                                             */
  /* ============================================================= */

  server.post('/data-rights/retention-policies', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (
      !body.dataClass ||
      !body.retentionDays ||
      !body.action ||
      !body.description ||
      !body.regulatoryBasis
    ) {
      return reply.code(400).send({
        ok: false,
        error: 'dataClass, retentionDays, action, description, and regulatoryBasis required',
      });
    }
    const policy = createRetentionPolicy(tenantId, {
      dataClass: body.dataClass as DataClass,
      retentionDays: body.retentionDays as number,
      action: body.action as RetentionAction,
      description: body.description as string,
      regulatoryBasis: body.regulatoryBasis as string,
      actor: getActor(request),
    });
    return reply.code(201).send({ ok: true, policy });
  });

  server.get('/data-rights/retention-policies', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const policies = listRetentionPolicies(tenantId);
    return reply.send({ ok: true, policies, count: policies.length });
  });

  server.get('/data-rights/retention-policies/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const policy = getRetentionPolicy(id, tenantId);
    if (!policy) {
      return reply.code(404).send({ ok: false, error: 'Policy not found' });
    }
    return reply.send({ ok: true, policy });
  });

  server.patch('/data-rights/retention-policies/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getRetentionPolicy(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Policy not found' });
    }
    const policy = updateRetentionPolicy(
      tenantId,
      id,
      {
        retentionDays: body.retentionDays as number | undefined,
        action: body.action as RetentionAction | undefined,
        description: body.description as string | undefined,
      },
      getActor(request)
    );
    if (!policy) return reply.code(404).send({ ok: false, error: 'Policy not found' });
    return reply.send({ ok: true, policy });
  });

  server.delete('/data-rights/retention-policies/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getRetentionPolicy(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Policy not found' });
    }
    const ok = deleteRetentionPolicy(tenantId, id, getActor(request));
    if (!ok) return reply.code(404).send({ ok: false, error: 'Policy not found' });
    return reply.send({ ok: true });
  });

  /* ============================================================= */
  /* Deletion Requests                                              */
  /* ============================================================= */

  server.post('/data-rights/deletion-requests', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.dataClass || !body.subjectId || !body.reason) {
      return reply
        .code(400)
        .send({ ok: false, error: 'dataClass, subjectId, and reason required' });
    }
    const req = createDeletionRequest(tenantId, {
      requestedBy: getActor(request),
      dataClass: body.dataClass as DataClass,
      subjectId: body.subjectId as string,
      reason: body.reason as string,
    });
    return reply.code(201).send({ ok: true, deletionRequest: req });
  });

  server.get('/data-rights/deletion-requests', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const reqs = listDeletionRequests(tenantId, q.status as DeletionStatus | undefined);
    return reply.send({ ok: true, deletionRequests: reqs, count: reqs.length });
  });

  server.get('/data-rights/deletion-requests/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const req = getDeletionRequest(id, tenantId);
    if (!req) {
      return reply.code(404).send({ ok: false, error: 'Deletion request not found' });
    }
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post('/data-rights/deletion-requests/:id/approve', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getDeletionRequest(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Deletion request not found' });
    }
    const req = approveDeletionRequest(tenantId, id, getActor(request));
    if (!req) return reply.code(400).send({ ok: false, error: 'Cannot approve deletion request' });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post('/data-rights/deletion-requests/:id/reject', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const existing = getDeletionRequest(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Deletion request not found' });
    }
    if (!body.reason) return reply.code(400).send({ ok: false, error: 'reason required' });
    const req = rejectDeletionRequest(tenantId, id, getActor(request), body.reason as string);
    if (!req) return reply.code(400).send({ ok: false, error: 'Cannot reject deletion request' });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post('/data-rights/deletion-requests/:id/execute', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getDeletionRequest(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Deletion request not found' });
    }
    const req = executeDeletionRequest(tenantId, id, getActor(request));
    if (!req) return reply.code(400).send({ ok: false, error: 'Cannot execute deletion request' });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post('/data-rights/deletion-requests/:id/verify', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getDeletionRequest(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Deletion request not found' });
    }
    const req = verifyDeletionRequest(tenantId, id, getActor(request));
    if (!req) return reply.code(400).send({ ok: false, error: 'Cannot verify deletion request' });
    return reply.send({ ok: true, deletionRequest: req });
  });

  /* ============================================================= */
  /* Legal Holds                                                    */
  /* ============================================================= */

  server.post('/data-rights/legal-holds', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.caseReference || !body.dataClasses || !body.reason) {
      return reply
        .code(400)
        .send({ ok: false, error: 'caseReference, dataClasses, and reason required' });
    }
    const hold = createLegalHold(tenantId, {
      caseReference: body.caseReference as string,
      dataClasses: body.dataClasses as DataClass[],
      subjectIds: body.subjectIds as string[] | undefined,
      reason: body.reason as string,
      createdBy: getActor(request),
      expiresAt: body.expiresAt as string | undefined,
    });
    return reply.code(201).send({ ok: true, legalHold: hold });
  });

  server.get('/data-rights/legal-holds', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const holds = listLegalHolds(tenantId, q.status as LegalHoldStatus | undefined);
    return reply.send({ ok: true, legalHolds: holds, count: holds.length });
  });

  server.get('/data-rights/legal-holds/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const hold = getLegalHold(id, tenantId);
    if (!hold) {
      return reply.code(404).send({ ok: false, error: 'Legal hold not found' });
    }
    return reply.send({ ok: true, legalHold: hold });
  });

  server.post('/data-rights/legal-holds/:id/release', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const existing = getLegalHold(id, tenantId);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Legal hold not found' });
    }
    const hold = releaseLegalHold(tenantId, id, getActor(request));
    if (!hold) return reply.code(400).send({ ok: false, error: 'Cannot release legal hold' });
    return reply.send({ ok: true, legalHold: hold });
  });

  /* ============================================================= */
  /* Audit Trail                                                    */
  /* ============================================================= */

  server.get('/data-rights/audit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const limit = parseInt(q.limit || '100', 10);
    const entries = getDataRightsAudit(tenantId, limit);
    return reply.send({ ok: true, entries, count: entries.length });
  });

  server.get('/data-rights/audit/verify', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const result = verifyDataRightsAuditChain(tenantId);
    return reply.send({ ok: true, chain: result });
  });

  /* ============================================================= */
  /* Summary                                                        */
  /* ============================================================= */

  server.get('/data-rights/summary', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const summary = getDataRightsSummary(tenantId);
    return reply.send({ ok: true, summary });
  });
}
