/**
 * DSAR Routes — Phase 496 (W34-P6)
 *
 * Data Subject Access Request endpoints. Pack-aware: reads
 * rightToErasure, dataPortability, retentionMinYears from
 * the tenant's country pack via request.countryPolicy.
 *
 * Session-authenticated. No PHI in audit or logs.
 */

import type { FastifyInstance } from 'fastify';
import { getEffectivePolicy } from '../middleware/country-policy-hook.js';
import {
  createDsarRequest,
  getDsarRequest,
  listDsarRequests,
  transitionDsar,
  getDsarStats,
  type DsarType,
} from '../services/dsar-store.js';
import { validateRetention, buildRetentionPolicy } from '../services/retention-engine.js';

const VALID_TYPES: DsarType[] = [
  'access',
  'erasure',
  'portability',
  'rectification',
  'restriction',
];

export async function dsarRoutes(app: FastifyInstance): Promise<void> {
  // POST /dsar/requests — create a DSAR request
  app.post('/dsar/requests', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { tenantId, requestType, subjectRef, requestedBy, dueDays } = body as Record<
      string,
      string
    >;

    if (!tenantId || !requestType || !subjectRef || !requestedBy) {
      return reply.code(400).send({
        ok: false,
        error: 'tenantId, requestType, subjectRef, requestedBy required',
      });
    }

    if (!VALID_TYPES.includes(requestType as DsarType)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid requestType. Valid: ${VALID_TYPES.join(', ')}`,
      });
    }

    const policy = getEffectivePolicy(request);
    const reg = policy.pack?.regulatoryProfile;

    // Gate erasure requests on rightToErasure
    if (requestType === 'erasure' && !(reg?.rightToErasure ?? false)) {
      return reply.code(403).send({
        ok: false,
        error: `Erasure requests not permitted under ${reg?.framework || 'HIPAA'} (rightToErasure: false)`,
        countryPackId: policy.countryPackId,
      });
    }

    // Gate portability requests on dataPortability
    if (requestType === 'portability' && !(reg?.dataPortability ?? false)) {
      return reply.code(403).send({
        ok: false,
        error: `Portability requests not permitted under ${reg?.framework || 'HIPAA'} (dataPortability: false)`,
        countryPackId: policy.countryPackId,
      });
    }

    const daysUntilDue = parseInt(dueDays || '30', 10);
    const dueDate = new Date(Date.now() + daysUntilDue * 86_400_000).toISOString();

    const req = createDsarRequest({
      tenantId,
      requestType: requestType as DsarType,
      subjectRef,
      requestedBy,
      requestedAt: new Date().toISOString(),
      countryPackId: policy.countryPackId,
      framework: reg?.framework || 'HIPAA',
      rightToErasure: reg?.rightToErasure ?? false,
      dataPortability: reg?.dataPortability ?? false,
      dueDate,
      metadata: {},
    });

    return reply.code(201).send({ ok: true, request: req });
  });

  // GET /dsar/requests — list DSAR requests
  app.get('/dsar/requests', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { tenantId, status, requestType, limit } = query;

    if (!tenantId) {
      return reply.code(400).send({ ok: false, error: 'tenantId required' });
    }

    const requests = listDsarRequests(tenantId, {
      status: status as any,
      requestType: requestType as any,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { ok: true, requests, total: requests.length };
  });

  // GET /dsar/requests/:id — get a DSAR request
  app.get('/dsar/requests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = getDsarRequest(id);
    if (!req) {
      return reply.code(404).send({ ok: false, error: 'DSAR request not found' });
    }
    return { ok: true, request: req };
  });

  // POST /dsar/requests/:id/process — transition to processing
  app.post('/dsar/requests/:id/process', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const by = (body.by as string) || 'admin';

    const updated = transitionDsar(id, 'processing', by);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Not found or invalid transition' });
    }
    return { ok: true, request: updated };
  });

  // POST /dsar/requests/:id/fulfill — transition to fulfilled
  app.post('/dsar/requests/:id/fulfill', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const by = (body.by as string) || 'admin';

    const updated = transitionDsar(id, 'fulfilled', by);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Not found or invalid transition' });
    }
    return { ok: true, request: updated };
  });

  // POST /dsar/requests/:id/deny — deny a DSAR request
  app.post('/dsar/requests/:id/deny', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const by = (body.by as string) || 'admin';
    const reason = (body.reason as string) || 'Denied by administrator';

    const updated = transitionDsar(id, 'denied', by, { denialReason: reason });
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Not found or invalid transition' });
    }
    return { ok: true, request: updated };
  });

  // POST /dsar/requests/:id/export — transition to exported
  app.post('/dsar/requests/:id/export', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    const by = (body.by as string) || 'admin';
    const exportRef = (body.exportRef as string) || null;

    const updated = transitionDsar(id, 'exported', by, { exportRef: exportRef || undefined });
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Not found or invalid transition' });
    }
    return { ok: true, request: updated };
  });

  // GET /dsar/stats — DSAR statistics for a tenant
  app.get('/dsar/stats', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { tenantId } = query;
    if (!tenantId) {
      return reply.code(400).send({ ok: false, error: 'tenantId required' });
    }
    const stats = getDsarStats(tenantId);
    return { ok: true, ...stats };
  });

  // POST /dsar/validate-retention — validate deletion against retention policy
  app.post('/dsar/validate-retention', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { recordCreatedAt } = body as { recordCreatedAt: string };

    if (!recordCreatedAt) {
      return reply.code(400).send({ ok: false, error: 'recordCreatedAt required' });
    }

    const policy = getEffectivePolicy(request);
    const retentionPolicy = buildRetentionPolicy(policy.pack?.regulatoryProfile);
    const result = validateRetention(recordCreatedAt, retentionPolicy);

    return {
      ok: true,
      countryPackId: policy.countryPackId,
      framework: policy.pack?.regulatoryProfile?.framework || 'HIPAA',
      ...result,
    };
  });
}
