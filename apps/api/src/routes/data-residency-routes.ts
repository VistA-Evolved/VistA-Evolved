/**
 * Data Residency Routes — Phase 311
 * Phase 495 (W34-P5): + pack-aware residency enforcement endpoint.
 *
 * Admin-only endpoints for managing data regions and transfer agreements.
 */

import type { FastifyInstance } from 'fastify';
import {
  DATA_REGIONS,
  REGION_CATALOG,
  isValidDataRegion,
  getRegionMetadata,
  resolveRegionPgUrl,
  resolveRegionAuditBucket,
  validateCrossBorderTransfer,
  enforcePackResidency,
  type DataTransferAgreement,
  type DataRegion,
} from '../platform/data-residency.js';
import { getEffectivePolicy } from '../middleware/country-policy-hook.js';
import { randomBytes } from 'node:crypto';

// ── In-Memory Stores (Phase 311 scaffold) ──────────────────────

const transferAgreements = new Map<string, DataTransferAgreement>();
const tenantRegions = new Map<string, DataRegion>();

// ── Route Registration ─────────────────────────────────────────

export async function dataResidencyRoutes(app: FastifyInstance): Promise<void> {
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

  function requireMatchingTenantParam(request: any, reply: any, tenantId: string): boolean {
    const requestedTenantId =
      typeof request?.params?.tenantId === 'string' && request.params.tenantId.trim().length > 0
        ? request.params.tenantId.trim()
        : null;
    if (requestedTenantId && requestedTenantId !== tenantId) {
      reply.code(404).send({ ok: false, error: 'Tenant not found' });
      return false;
    }
    return true;
  }

  // GET /residency/regions — list all data regions
  app.get('/residency/regions', async (_request, _reply) => {
    return {
      ok: true,
      regions: REGION_CATALOG.map((r) => ({
        ...r,
        pgUrlConfigured: !!safeResolvePg(r.region),
        auditBucket: resolveRegionAuditBucket(r.region),
      })),
    };
  });

  // GET /residency/regions/:region — get region details
  app.get('/residency/regions/:region', async (request, reply) => {
    const { region } = request.params as { region: string };
    if (!isValidDataRegion(region)) {
      return reply.code(404).send({ ok: false, error: 'Unknown region' });
    }
    const meta = getRegionMetadata(region);
    return {
      ok: true,
      region: meta,
      pgUrlConfigured: !!safeResolvePg(region),
      auditBucket: resolveRegionAuditBucket(region),
    };
  });

  // GET /residency/tenant/:tenantId — get tenant's region assignment
  app.get('/residency/tenant/:tenantId', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!requireMatchingTenantParam(request, reply, tenantId)) return;
    const region = tenantRegions.get(tenantId);
    if (!region) {
      return reply.code(404).send({ ok: false, error: 'Tenant has no region assignment' });
    }
    return {
      ok: true,
      tenantId,
      dataRegion: region,
      regionMeta: getRegionMetadata(region),
      immutable: true,
    };
  });

  // POST /residency/tenant/:tenantId/assign — assign region (one-time only)
  app.post('/residency/tenant/:tenantId/assign', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!requireMatchingTenantParam(request, reply, tenantId)) return;
    const body = (request.body as Record<string, unknown>) || {};
    const region = body.dataRegion as string;

    if (!region || !isValidDataRegion(region)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid region. Valid: ${DATA_REGIONS.join(', ')}`,
      });
    }

    // Immutability check
    if (tenantRegions.has(tenantId)) {
      const existing = tenantRegions.get(tenantId);
      return reply.code(409).send({
        ok: false,
        error: `Tenant already assigned to region "${existing}". Region is immutable.`,
      });
    }

    const meta = getRegionMetadata(region);
    if (meta?.status === 'planned') {
      return reply.code(400).send({
        ok: false,
        error: `Region "${region}" is not yet active.`,
      });
    }

    tenantRegions.set(tenantId, region);
    return {
      ok: true,
      tenantId,
      dataRegion: region,
      immutable: true,
      assignedAt: new Date().toISOString(),
    };
  });

  // POST /residency/transfer-agreements — create a data transfer agreement
  app.post('/residency/transfer-agreements', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const {
      sourceRegion,
      targetRegion,
      purpose,
      legalBasis,
      consentEvidenceRef,
      approvedBy,
      expiresAt,
    } = body as Record<string, string>;

    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!sourceRegion || !targetRegion || !purpose || !legalBasis) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing required fields: sourceRegion, targetRegion, purpose, legalBasis',
      });
    }

    if (!isValidDataRegion(sourceRegion) || !isValidDataRegion(targetRegion)) {
      return reply.code(400).send({ ok: false, error: 'Invalid region' });
    }

    // Validate the transfer
    const validation = validateCrossBorderTransfer(
      sourceRegion as DataRegion,
      targetRegion as DataRegion,
      !!consentEvidenceRef,
      true // creating agreement counts
    );

    const agreement: DataTransferAgreement = {
      id: `dta-${randomBytes(8).toString('hex')}`,
      tenantId,
      sourceRegion: sourceRegion as DataRegion,
      targetRegion: targetRegion as DataRegion,
      purpose,
      legalBasis,
      consentEvidenceRef: consentEvidenceRef || '',
      approvedBy: approvedBy || 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 365 * 86_400_000).toISOString(),
      status: 'active',
    };

    transferAgreements.set(agreement.id, agreement);

    return {
      ok: true,
      agreement,
      transferValidation: validation,
    };
  });

  // GET /residency/transfer-agreements — list agreements
  app.get('/residency/transfer-agreements', async (request) => {
    const tenantId = resolveTenantId(request);
    if (!tenantId) {
      return { ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' };
    }
    const query = (request.query as Record<string, string>) || {};
    let agreements = [...transferAgreements.values()].filter(
      (agreement) => agreement.tenantId === tenantId
    );
    if (query.status) {
      agreements = agreements.filter((a) => a.status === query.status);
    }

    return { ok: true, agreements, total: agreements.length };
  });

  // POST /residency/validate-transfer — check if transfer is allowed
  app.post('/residency/validate-transfer', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { sourceRegion, targetRegion, hasConsent, hasAgreement } = body as {
      sourceRegion: string;
      targetRegion: string;
      hasConsent: boolean;
      hasAgreement: boolean;
    };

    if (!sourceRegion || !targetRegion) {
      return reply.code(400).send({ ok: false, error: 'sourceRegion and targetRegion required' });
    }

    if (!isValidDataRegion(sourceRegion) || !isValidDataRegion(targetRegion)) {
      return reply.code(400).send({ ok: false, error: 'Invalid region' });
    }

    const result = validateCrossBorderTransfer(
      sourceRegion as DataRegion,
      targetRegion as DataRegion,
      !!hasConsent,
      !!hasAgreement
    );

    return { ok: true, ...result };
  });

  // Phase 495 (W34-P5): Pack-aware residency enforcement
  // Auto-resolves pack dataResidency config from request.countryPolicy.
  app.post('/residency/enforce-pack-transfer', async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { targetRegion, hasConsent, hasAgreement } = body as {
      targetRegion: string;
      hasConsent: boolean;
      hasAgreement: boolean;
    };

    if (!targetRegion) {
      return reply.code(400).send({ ok: false, error: 'targetRegion required' });
    }

    const policy = getEffectivePolicy(request);
    const packResidency = policy.pack?.dataResidency;

    if (!packResidency) {
      return reply.code(422).send({
        ok: false,
        error: 'No data residency config in country pack',
        countryPackId: policy.countryPackId,
      });
    }

    const tenantRegion = packResidency.region || 'us-east';
    const result = enforcePackResidency(
      {
        region: packResidency.region,
        crossBorderTransferAllowed: packResidency.crossBorderTransferAllowed ?? false,
        requiresConsentForTransfer: packResidency.requiresConsentForTransfer ?? false,
        retentionMinYears: packResidency.retentionMinYears ?? 6,
      },
      tenantRegion,
      targetRegion,
      !!hasConsent,
      !!hasAgreement
    );

    return {
      ok: true,
      countryPackId: policy.countryPackId,
      tenantRegion,
      targetRegion,
      ...result,
    };
  });
}

// ── Helpers ────────────────────────────────────────────────────

function safeResolvePg(region: DataRegion): string | null {
  try {
    return resolveRegionPgUrl(region);
  } catch {
    return null;
  }
}
