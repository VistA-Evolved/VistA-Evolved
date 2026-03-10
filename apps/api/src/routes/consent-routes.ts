/**
 * Consent Routes -- Phase 312
 *
 * Patient consent management endpoints. Session-authenticated.
 * PHI (patientDfn) is never included in audit logs.
 */

import type { FastifyInstance } from 'fastify';
import {
  CONSENT_CATEGORIES,
  type ConsentCategory,
  createConsentRecord,
  getConsentRecords,
  getActiveConsent,
  revokeConsent,
  checkConsentCompliance,
  getConsentProfile,
  getConsentProfileForPack,
  listConsentProfiles,
} from '../services/consent-engine.js';
import { getEffectivePolicy } from '../middleware/country-policy-hook.js';

export async function consentRoutes(app: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any): string | null {
    const requestTenantId =
      typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
        ? request.tenantId.trim()
        : undefined;
    const sessionTenantId =
      typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
        ? request.session.tenantId.trim()
        : undefined;
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return requestTenantId || sessionTenantId || headerTenant || null;
  }

  function requireTenantId(request: any, reply: any): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  // GET /consent/profiles -- list available regulatory consent profiles
  app.get('/consent/profiles', async () => {
    const names = listConsentProfiles();
    const profiles = names.map((name) => ({
      framework: name,
      profile: getConsentProfile(name),
    }));
    return { ok: true, profiles };
  });

  // GET /consent/categories -- list consent categories
  app.get('/consent/categories', async () => {
    return { ok: true, categories: [...CONSENT_CATEGORIES] };
  });

  // GET /consent/patient -- get consent records for a patient
  app.get('/consent/patient', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { dfn } = query;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!dfn) {
      return reply.code(400).send({ ok: false, error: 'dfn required' });
    }

    const records = getConsentRecords(tenantId, dfn);
    return { ok: true, records, total: records.length };
  });

  // GET /consent/check -- check consent compliance for a patient
  app.get('/consent/check', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { dfn, framework } = query;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!dfn || !framework) {
      return reply.code(400).send({ ok: false, error: 'dfn and framework required' });
    }

    const profile = getConsentProfile(framework);
    if (!profile) {
      return reply.code(404).send({ ok: false, error: `Unknown framework: ${framework}` });
    }

    const result = checkConsentCompliance(tenantId, dfn, profile);
    return { ok: true, ...result };
  });

  // POST /consent/grant -- grant consent for a category
  app.post('/consent/grant', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const {
      patientDfn,
      category,
      grantedBy,
      regulatoryBasis,
      expiresAt,
      evidence,
      version,
    } = body as Record<string, string>;

    if (!patientDfn || !category || !grantedBy) {
      return reply.code(400).send({
        ok: false,
        error: 'patientDfn, category, grantedBy required',
      });
    }

    if (!CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid category. Valid: ${CONSENT_CATEGORIES.join(', ')}`,
      });
    }

    const record = createConsentRecord({
      tenantId,
      patientDfn,
      category: category as ConsentCategory,
      status: 'granted',
      granularity: 'category',
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      regulatoryBasis: regulatoryBasis || '',
      version: parseInt(version || '1', 10),
      evidence: evidence as string | undefined,
    });

    return { ok: true, consent: record };
  });

  // POST /consent/revoke -- revoke a consent
  app.post('/consent/revoke', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { consentId, revokedBy, reason } = body as Record<string, string>;

    if (!consentId || !revokedBy || !reason) {
      return reply.code(400).send({
        ok: false,
        error: 'consentId, revokedBy, reason required',
      });
    }

    const revoked = revokeConsent(tenantId, consentId, revokedBy, reason);
    if (!revoked) {
      return reply.code(404).send({
        ok: false,
        error: 'Consent not found or not in granted status',
      });
    }

    return { ok: true, consent: revoked };
  });

  // GET /consent/active -- get active consent for a specific category
  app.get('/consent/active', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { dfn, category } = query;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!dfn || !category) {
      return reply.code(400).send({ ok: false, error: 'dfn and category required' });
    }

    if (!CONSENT_CATEGORIES.includes(category as ConsentCategory)) {
      return reply.code(400).send({ ok: false, error: 'Invalid category' });
    }

    const active = getActiveConsent(tenantId, dfn, category as ConsentCategory);
    return {
      ok: true,
      hasActiveConsent: !!active,
      consent: active || null,
    };
  });

  // Phase 494 (W34-P4): Country-policy-aware consent compliance check
  // Auto-resolves framework from the tenant's bound country pack.
  app.get('/consent/policy-check', async (request, reply) => {
    const query = (request.query as Record<string, string>) || {};
    const { dfn } = query;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!dfn) {
      return reply.code(400).send({ ok: false, error: 'dfn required' });
    }

    const policy = getEffectivePolicy(request);
    const pack = policy.pack;
    const profile = pack ? getConsentProfileForPack(pack) : getConsentProfile('HIPAA');

    if (!profile) {
      return reply.code(500).send({ ok: false, error: 'Could not resolve consent profile' });
    }

    const result = checkConsentCompliance(tenantId, dfn, profile);
    return {
      ok: true,
      framework: profile.framework,
      granularity: profile.granularity,
      countryPackId: policy.countryPackId,
      resolvedFromPack: !!pack,
      ...result,
    };
  });
}
