/**
 * Privacy Management Routes — Phase 343 (W16-P7).
 * Phase 494 (W34-P4): + /privacy/rights endpoint for pack-resolved rights.
 *
 * Endpoints for sensitivity tag management, access reason queries,
 * and privacy stats.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  addSensitivityTag,
  removeSensitivityTag,
  getSensitivityTags,
  checkSensitivityAccess,
  recordAccessReason,
  queryAccessReasons,
  getPrivacyStats,
  type SensitivityCategory,
} from '../auth/privacy-segmentation.js';
import { getEffectivePolicy } from '../middleware/country-policy-hook.js';

export async function privacyRoutes(app: FastifyInstance): Promise<void> {
  function resolveTenantId(request: FastifyRequest): string | null {
    const requestTenantId = (request as any).tenantId || (request as any).session?.tenantId;
    if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
      return requestTenantId.trim();
    }
    const headerTenantId = request.headers['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return headerTenant || null;
  }

  function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /**
   * GET /privacy/tags — List sensitivity tags.
   */
  app.get('/privacy/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const query = request.query as {
      patientDfn?: string;
      recordType?: string;
      category?: SensitivityCategory;
    };
    const tags = getSensitivityTags({
      ...query,
      tenantId,
    });
    return reply.send({ ok: true, tags, total: tags.length });
  });

  /**
   * POST /privacy/tags — Add a sensitivity tag.
   */
  app.post('/privacy/tags', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!body.category) {
      return reply.code(400).send({ ok: false, error: 'category required' });
    }

    const tag = addSensitivityTag({
      tenantId,
      patientDfn: body.patientDfn as string | undefined,
      recordType: body.recordType as string | undefined,
      recordId: body.recordId as string | undefined,
      category: body.category as SensitivityCategory,
      appliedBy: session?.userName || session?.duz || 'admin',
      source: (body.source as string) || 'manual',
      label: body.label as string | undefined,
    });

    return reply.code(201).send({ ok: true, tag });
  });

  /**
   * DELETE /privacy/tags/:id — Remove a sensitivity tag.
   */
  app.delete('/privacy/tags/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const existing = getSensitivityTags({ tenantId }).find((tag) => tag.id === id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'tag_not_found' });
    }
    const removed = removeSensitivityTag(id, session?.userName || session?.duz || 'admin');
    return reply.send({ ok: removed, removed });
  });

  /**
   * POST /privacy/check-access — Check sensitivity access for a record.
   */
  app.post('/privacy/check-access', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!body.recordType || !body.recordId) {
      return reply.code(400).send({ ok: false, error: 'recordType and recordId required' });
    }

    const result = checkSensitivityAccess(
      tenantId,
      body.recordType as string,
      body.recordId as string,
      session?.role || 'clerk',
      !!(body.hasBreakGlass ?? false)
    );

    return reply.send({ ok: true, ...result });
  });

  /**
   * POST /privacy/access-reasons — Record access reason.
   */
  app.post('/privacy/access-reasons', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!body.reason || !body.patientDfn || !body.recordType || !body.recordId) {
      return reply
        .code(400)
        .send({ ok: false, error: 'reason, patientDfn, recordType, and recordId required' });
    }

    const entry = recordAccessReason({
      tenantId,
      userId: session?.duz || 'unknown',
      userName: session?.userName || 'unknown',
      patientDfn: body.patientDfn as string,
      recordType: body.recordType as string,
      recordId: body.recordId as string,
      categories: (body.categories as SensitivityCategory[]) || [],
      reason: body.reason as string,
      breakGlass: !!(body.breakGlass ?? false),
    });

    return reply.code(201).send({ ok: true, accessReason: entry });
  });

  /**
   * GET /privacy/access-reasons — Query access reasons.
   */
  app.get('/privacy/access-reasons', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const query = request.query as {
      userId?: string;
      patientDfn?: string;
      breakGlass?: string;
      limit?: string;
    };
    const reasons = queryAccessReasons({
      ...query,
      tenantId,
      breakGlass:
        query.breakGlass === 'true' ? true : query.breakGlass === 'false' ? false : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send({ ok: true, reasons, total: reasons.length });
  });

  /**
   * GET /privacy/stats — Privacy statistics.
   */
  app.get('/privacy/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const stats = getPrivacyStats(tenantId);
    return reply.send({ ok: true, ...stats });
  });

  /**
   * Phase 494 (W34-P4): GET /privacy/rights — Effective privacy rights from country pack.
   * Returns rightToErasure, dataPortability, breakGlassAllowed from the tenant's pack.
   */
  app.get('/privacy/rights', async (request: FastifyRequest, reply: FastifyReply) => {
    const policy = getEffectivePolicy(request);
    const reg = policy.pack?.regulatoryProfile;
    return reply.send({
      ok: true,
      countryPackId: policy.countryPackId,
      resolvedFromPack: !!policy.pack,
      rights: {
        rightToErasure: reg?.rightToErasure ?? false,
        dataPortability: reg?.dataPortability ?? false,
        breakGlassAllowed: reg?.breakGlassAllowed ?? true,
        consentRequired: reg?.consentRequired ?? true,
        consentGranularity: reg?.consentGranularity ?? 'category',
        dataExportRestricted: reg?.dataExportRestricted ?? false,
        requiresConsentForTransfer: reg?.requiresConsentForTransfer ?? false,
        retentionMinYears: reg?.retentionMinYears ?? 6,
        retentionMaxYears: reg?.retentionMaxYears ?? null,
        auditRetentionDays: reg?.auditRetentionDays ?? 2190,
        framework: reg?.framework ?? 'HIPAA',
      },
    });
  });
}
