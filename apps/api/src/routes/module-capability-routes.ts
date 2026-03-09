/**
 * Module & Capability API Routes — Phase 37C, enhanced Phase 51.
 *
 * Exposes module registry status, capability resolution, adapter
 * health, and marketplace tenant config to admin dashboards and
 * the UI capability-driven rendering.
 *
 * Public routes (session auth):
 *   GET /api/capabilities           — resolved capabilities for this tenant
 *   GET /api/capabilities/summary   — live/pending/disabled counts
 *
 * Admin routes (admin role):
 *   GET  /api/modules/status        — module enablement status
 *   GET  /api/modules/skus          — available SKU profiles
 *   GET  /api/modules/manifests     — full module manifests (Phase 51)
 *   POST /api/modules/override      — per-tenant module override
 *   GET  /api/adapters/health       — adapter health status
 *   GET  /api/adapters/list         — all loaded adapters
 *   GET  /api/marketplace/config    — marketplace tenant config (Phase 51)
 *   PUT  /api/marketplace/config    — update marketplace tenant config (Phase 51)
 *   GET  /api/marketplace/jurisdictions — available jurisdiction packs (Phase 51)
 *   GET  /api/marketplace/summary   — marketplace summary stats (Phase 51)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { log } from '../lib/logger.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import {
  getModuleStatus,
  getSkuProfiles,
  getActiveSku,
  getActiveSkuProfile,
  setTenantModules,
  validateDependencies,
  getEnabledModules,
  getAllModuleManifests,
  getModuleDefinitions,
} from '../modules/module-registry.js';
import {
  resolveCapabilities,
  getCapabilitySummary,
  getCapabilitiesByModule,
} from '../modules/capability-service.js';
import { getAdapterHealth, getAllAdapters } from '../adapters/adapter-loader.js';
import {
  getMarketplaceTenantConfig,
  upsertMarketplaceTenant,
  getAvailableJurisdictions,
  getMarketplaceSummary,
  updateTenantConnectors,
  updateTenantJurisdiction,
} from '../config/marketplace-tenant.js';
import { isPgConfigured } from '../platform/pg/pg-db.js';
import {
  appendModuleAudit,
  getEnabledModuleIds,
  listTenantModules,
  setModuleEnabled,
} from '../platform/pg/repo/module-repo.js';

function resolveSessionTenantId(_request: FastifyRequest, session: any): string | null {
  const sessionTenantId =
    typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
      ? session.tenantId.trim()
      : undefined;
  return sessionTenantId || null;
}

function resolveAdminTenantId(_request: FastifyRequest, session: any): string | null {
  return resolveSessionTenantId(_request, session);
}

export default async function moduleCapabilityRoutes(server: FastifyInstance): Promise<void> {
  /* ---------------------------------------------------------------- */
  /* Public: Capability resolution (session auth via security.ts)      */
  /* ---------------------------------------------------------------- */

  /** GET /api/capabilities — resolved capabilities for current tenant. */
  server.get('/api/capabilities', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = resolveSessionTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }
    const capabilities = resolveCapabilities(tenantId);

    return {
      ok: true,
      tenantId,
      capabilities,
    };
  });

  /** GET /api/capabilities/summary — live/pending/disabled counts. */
  server.get('/api/capabilities/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const tenantId = resolveSessionTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }
    const summary = getCapabilitySummary(tenantId);

    return {
      ok: true,
      tenantId,
      summary,
    };
  });

  /** GET /api/capabilities/by-module — grouped capabilities. */
  server.get(
    '/api/capabilities/by-module',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const tenantId = resolveSessionTenantId(request, session);
      if (!tenantId) {
        reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
        return;
      }
      const grouped = getCapabilitiesByModule(tenantId);

      return {
        ok: true,
        tenantId,
        modules: grouped,
      };
    }
  );

  /* ---------------------------------------------------------------- */
  /* Admin: Module status & management                                 */
  /* ---------------------------------------------------------------- */

  /** GET /api/modules/status — module enablement status. */
  server.get('/api/modules/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    // Admin check
    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const tenantId = resolveAdminTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }
    let enabledModules = getEnabledModules(tenantId);
    if (isPgConfigured()) {
      const tenantRows = await listTenantModules(tenantId).catch(() => []);
      if (tenantRows.length > 0) {
        enabledModules = await getEnabledModuleIds(tenantId).catch(() => getEnabledModules(tenantId));
      }
    }
    const status = getModuleStatus(tenantId).map((entry) => ({
      ...entry,
      enabled: entry.alwaysEnabled || enabledModules.includes(entry.moduleId),
    }));
    const depErrors = validateDependencies(enabledModules);

    return {
      ok: true,
      sku: getActiveSku(),
      tenantId,
      modules: status,
      dependencyErrors: depErrors,
    };
  });

  /** GET /api/modules/skus — available SKU profiles. */
  server.get('/api/modules/skus', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    return {
      ok: true,
      activeSku: getActiveSku(),
      profiles: getSkuProfiles(),
    };
  });

  /** POST /api/modules/override — per-tenant module override. */
  server.post('/api/modules/override', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const body = (request.body as any) || {};
    const { modules } = body;
    const tenantId = resolveAdminTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }

    const actorId = String((session as any).duz || 'system');
    const beforeEnabledModules = isPgConfigured()
      ? await getEnabledModuleIds(tenantId).catch(() => getEnabledModules(tenantId))
      : getEnabledModules(tenantId);

    // null → clear overrides, array → set overrides
    if (modules === null || modules === undefined) {
      const skuModules = getActiveSkuProfile()?.modules || Object.keys(getModuleDefinitions());

      if (isPgConfigured()) {
        const defs = getModuleDefinitions();
        const desired = new Set(skuModules);
        for (const [moduleId, def] of Object.entries(defs)) {
          if (def.alwaysEnabled) continue;
          await setModuleEnabled(tenantId, moduleId, desired.has(moduleId), actorId);
        }
        setTenantModules(tenantId, await getEnabledModuleIds(tenantId));
        await appendModuleAudit({
          tenantId,
          actorId,
          actorType: 'user',
          entityType: 'entitlement',
          entityId: 'api.modules.override.clear',
          action: 'update',
          beforeJson: JSON.stringify({ enabledModules: beforeEnabledModules }),
          afterJson: JSON.stringify({ enabledModules: skuModules }),
          reason: 'Reverted tenant module overrides to active SKU defaults',
        });
      } else {
        setTenantModules(tenantId, null);
      }

      log.info('Cleared module overrides for tenant', { tenantId, mode: isPgConfigured() ? 'pg' : 'memory' });

      // Immutable audit event
      immutableAudit(
        'module.override-clear',
        'success',
        {
          sub: (session as any).duz,
          name: (session as any).displayName,
          roles: [(session as any).role],
        },
        {
          tenantId,
          detail: { action: 'clear-overrides' },
        }
      );

      return { ok: true, message: `Overrides cleared for tenant '${tenantId}'` };
    }

    if (!Array.isArray(modules)) {
      reply.code(400).send({ ok: false, error: 'modules must be an array or null' });
      return;
    }

    // Validate dependencies before applying
    const depErrors = validateDependencies(modules);
    if (depErrors.length > 0) {
      reply.code(400).send({
        ok: false,
        error: 'Dependency validation failed',
        details: depErrors,
      });
      return;
    }

    let appliedModules = modules;
    if (isPgConfigured()) {
      const defs = getModuleDefinitions();
      const desired = new Set(modules);
      for (const [moduleId, def] of Object.entries(defs)) {
        if (def.alwaysEnabled) continue;
        await setModuleEnabled(tenantId, moduleId, desired.has(moduleId), actorId);
      }
      appliedModules = await getEnabledModuleIds(tenantId).catch(() => modules);
      setTenantModules(tenantId, appliedModules);
      await appendModuleAudit({
        tenantId,
        actorId,
        actorType: 'user',
        entityType: 'entitlement',
        entityId: 'api.modules.override',
        action: 'update',
        beforeJson: JSON.stringify({ enabledModules: beforeEnabledModules }),
        afterJson: JSON.stringify({ enabledModules: appliedModules }),
        reason: 'Applied module override via legacy API endpoint',
      });
    } else {
      setTenantModules(tenantId, modules);
    }
    log.info('Applied module overrides for tenant', {
      tenantId,
      modules: appliedModules,
      mode: isPgConfigured() ? 'pg' : 'memory',
    });

    // Immutable audit event
    immutableAudit(
      'module.toggle',
      'success',
      {
        sub: (session as any).duz,
        name: (session as any).displayName,
        roles: [(session as any).role],
      },
      {
        tenantId,
        detail: { action: 'set-overrides', modules },
      }
    );

    return {
      ok: true,
      message: `Module overrides applied for tenant '${tenantId}'`,
      enabledModules: isPgConfigured() ? appliedModules : getEnabledModules(tenantId),
    };
  });

  /* ---------------------------------------------------------------- */
  /* Admin: Adapter health & info                                      */
  /* ---------------------------------------------------------------- */

  /** GET /api/adapters/health — adapter health status. */
  server.get('/api/adapters/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const health = await getAdapterHealth();
    return { ok: true, adapters: health };
  });

  /** GET /api/adapters/list — all loaded adapters. */
  server.get('/api/adapters/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const adapters = getAllAdapters();
    const list = [...adapters.entries()].map(([type, adapter]) => ({
      type,
      implementation: adapter.implementationName,
      isStub: adapter._isStub,
    }));

    return { ok: true, adapters: list };
  });

  /* ---------------------------------------------------------------- */
  /* Phase 51: Module manifests (marketplace-ready)                    */
  /* ---------------------------------------------------------------- */

  /** GET /api/modules/manifests — full module manifests with dependency status. */
  server.get('/api/modules/manifests', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const tenantId = resolveAdminTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }
    let enabledModules = getEnabledModules(tenantId);
    if (isPgConfigured()) {
      const tenantRows = await listTenantModules(tenantId).catch(() => []);
      if (tenantRows.length > 0) {
        enabledModules = await getEnabledModuleIds(tenantId).catch(() => getEnabledModules(tenantId));
      }
    }
    const enabledSet = new Set(enabledModules);
    const manifests = getAllModuleManifests(tenantId).map((entry) => ({
      ...entry,
      enabled: entry.manifest.alwaysEnabled || enabledSet.has(entry.moduleId),
      dependenciesMet: entry.manifest.dependencies.every(
        (dep) => dep === 'kernel' || enabledSet.has(dep)
      ),
      missingDependencies: entry.manifest.dependencies.filter(
        (dep) => dep !== 'kernel' && !enabledSet.has(dep)
      ),
    }));

    return {
      ok: true,
      tenantId,
      manifests,
    };
  });

  /* ---------------------------------------------------------------- */
  /* Phase 51: Marketplace tenant config                               */
  /* ---------------------------------------------------------------- */

  /** GET /api/marketplace/config — marketplace tenant config. */
  server.get('/api/marketplace/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const tenantId = resolveAdminTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }
    const config = getMarketplaceTenantConfig(tenantId);

    if (!config) {
      reply.code(404).send({ ok: false, error: `Tenant '${tenantId}' not found` });
      return;
    }

    return { ok: true, config };
  });

  /** PUT /api/marketplace/config — update marketplace tenant config. */
  server.put('/api/marketplace/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    const body = (request.body as any) || {};
    const { facilityName, jurisdiction, enabledModules, connectors, customSettings } = body;
    const tenantId = resolveAdminTenantId(request, session);
    if (!tenantId) {
      reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
      return;
    }

    const result = upsertMarketplaceTenant({
      tenantId,
      facilityName,
      jurisdiction,
      enabledModules,
      connectors,
      customSettings,
    });

    if (!result.ok) {
      reply
        .code(400)
        .send({ ok: false, error: 'Dependency validation failed', details: result.errors });
      return;
    }

    return { ok: true, config: result.config };
  });

  /** PATCH /api/marketplace/connectors — update connector settings only. */
  server.patch(
    '/api/marketplace/connectors',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      if ((session as any).role !== 'admin') {
        reply.code(403).send({ ok: false, error: 'Admin role required' });
        return;
      }

      const body = (request.body as any) || {};
      const { connectors } = body;
      const tenantId = resolveAdminTenantId(request, session);
      if (!tenantId) {
        reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
        return;
      }

      if (!Array.isArray(connectors)) {
        reply.code(400).send({ ok: false, error: 'connectors[] is required' });
        return;
      }

      const result = updateTenantConnectors(tenantId, connectors);
      if (!result.ok) {
        reply.code(404).send({ ok: false, error: result.error });
        return;
      }

      return { ok: true, message: 'Connectors updated' };
    }
  );

  /** PATCH /api/marketplace/jurisdiction — change jurisdiction pack. */
  server.patch(
    '/api/marketplace/jurisdiction',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      if ((session as any).role !== 'admin') {
        reply.code(403).send({ ok: false, error: 'Admin role required' });
        return;
      }

      const body = (request.body as any) || {};
      const { jurisdiction } = body;
      const tenantId = resolveAdminTenantId(request, session);
      if (!tenantId) {
        reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
        return;
      }

      if (!jurisdiction) {
        reply.code(400).send({ ok: false, error: 'jurisdiction is required' });
        return;
      }

      const result = updateTenantJurisdiction(tenantId, jurisdiction);
      if (!result.ok) {
        reply.code(404).send({ ok: false, error: result.error });
        return;
      }

      return { ok: true, message: `Jurisdiction changed to '${jurisdiction}'` };
    }
  );

  /** GET /api/marketplace/jurisdictions — available jurisdiction packs. */
  server.get(
    '/api/marketplace/jurisdictions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      if ((session as any).role !== 'admin') {
        reply.code(403).send({ ok: false, error: 'Admin role required' });
        return;
      }

      return { ok: true, jurisdictions: getAvailableJurisdictions() };
    }
  );

  /** GET /api/marketplace/summary — marketplace summary stats. */
  server.get('/api/marketplace/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    if ((session as any).role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'Admin role required' });
      return;
    }

    return { ok: true, ...getMarketplaceSummary() };
  });
}
