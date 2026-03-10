/**
 * Admin routes -- Phase 17B.
 *
 * Tenant config, feature flags, UI defaults, note templates, connectors.
 * All endpoints require admin role (enforced by AUTH_RULES regex in security.ts).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireSession, requireRole } from '../auth/auth-routes.js';
import { audit } from '../lib/audit.js';
import { log } from '../lib/logger.js';
import {
  getTenant,
  listTenants,
  upsertTenant,
  deleteTenant,
  updateFeatureFlags,
  updateUIDefaults,
  updateEnabledModules,
  updateBranding,
  upsertNoteTemplate,
  deleteNoteTemplate,
  updateConnectorStatus,
  sanitizeBranding,
  type TenantConfig,
  type FeatureFlags,
  type UIDefaults,
  type ModuleId,
  type NoteTemplate,
  type BrandingConfig,
} from '../config/tenant-config.js';
import { probeConnect } from '../vista/rpcBroker.js';
import { getEnabledModules } from '../modules/module-registry.js';

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: 'system' };
}

function getSessionTenantId(request: FastifyRequest): string | null {
  const sessionTenantId =
    typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
      ? request.session.tenantId.trim()
      : undefined;
  return sessionTenantId || null;
}

function resolveAdminTargetTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
  explicitTenantId?: string,
  reason?: string
): string | undefined {
  const sessionTenantId = getSessionTenantId(request);
  if (!sessionTenantId) {
    reply.code(403).send({
      ok: false,
      code: 'TENANT_REQUIRED',
      error: 'Tenant context missing',
    });
    return undefined;
  }
  const targetTenantId =
    typeof explicitTenantId === 'string' && explicitTenantId.trim().length > 0
      ? explicitTenantId.trim()
      : sessionTenantId;
  if (targetTenantId !== sessionTenantId && (!reason || !reason.trim())) {
    reply.code(400).send({
      ok: false,
      error: 'reason is required for cross-tenant admin actions',
    });
    return undefined;
  }
  return targetTenantId;
}

function resolveProvisionTenantId(body: any): string | null {
  if (typeof body?.tenantId !== 'string') return null;
  const tenantId = body.tenantId.trim();
  return tenantId.length > 0 ? tenantId : null;
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

export default async function adminRoutes(server: FastifyInstance): Promise<void> {
  // -- Tenant CRUD -------------------------------------------------

  /** GET /admin/tenants -- list all tenants */
  server.get('/admin/tenants', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    return { ok: true, tenants: listTenants(), scope: 'platform-global' };
  });

  /** GET /admin/tenants/:tenantId -- get single tenant */
  server.get('/admin/tenants/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenant };
  });

  /** PUT /admin/tenants/:tenantId -- create or update tenant */
  server.put('/admin/tenants/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const body = request.body as Partial<TenantConfig>;
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, (body as any)?.reason);
    if (!tenantId) return reply;

    const config: TenantConfig = {
      tenantId,
      facilityName: body.facilityName ?? tenantId,
      facilityStation: body.facilityStation ?? '',
      vistaHost: body.vistaHost ?? '127.0.0.1',
      vistaPort: body.vistaPort ?? 9430,
      vistaContext: body.vistaContext ?? 'OR CPRS GUI CHART',
      enabledModules: body.enabledModules ?? [],
      featureFlags: body.featureFlags ?? {},
      uiDefaults: body.uiDefaults ?? {
        theme: 'light',
        density: 'comfortable',
        layoutMode: 'cprs',
        initialTab: 'cover',
        enableDragReorder: false,
        themePack: 'modern-default',
      },
      noteTemplates: body.noteTemplates ?? [],
      connectors: body.connectors ?? [],
      branding: body.branding ?? {
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '',
        secondaryColor: '',
        headerText: '',
        footerText: '',
        enabled: false,
      },
      countryPackId: body.countryPackId ?? 'US',
      locale: body.locale ?? 'en',
      timezone: body.timezone ?? 'America/New_York',
      createdAt: body.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = upsertTenant(config);

    audit('config.tenant-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId },
    });
    log.info('Tenant config updated', { tenantId });
    return { ok: true, tenant: result };
  });

  /** DELETE /admin/tenants/:tenantId -- delete tenant */
  server.delete('/admin/tenants/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const deleted = deleteTenant(tenantId);
    if (!deleted) return reply.code(400).send({ ok: false, error: 'Cannot delete default tenant' });
    return { ok: true, deleted: tenantId };
  });

  /**
   * POST /admin/tenants/provision -- Unified tenant provisioning pipeline.
   *
   * Orchestrates: tenant config creation, module entitlement seeding,
   * VistA connectivity probe, and optional billing customer creation.
   * Returns a structured result with per-step status.
   */
  server.post('/admin/tenants/provision', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as any) || {};

    const tenantId = resolveProvisionTenantId(body);
    if (!tenantId || typeof tenantId !== 'string' || tenantId.length < 2) {
      return reply.code(400).send({ ok: false, error: 'tenantId is required (min 2 chars)' });
    }
    const resolvedTargetTenantId = resolveAdminTargetTenantId(request, reply, tenantId, body.reason);
    if (!resolvedTargetTenantId) return;

    const existing = getTenant(resolvedTargetTenantId);
    if (existing) {
      return reply.code(409).send({ ok: false, error: `Tenant ${resolvedTargetTenantId} already exists` });
    }

    const steps: Array<{ step: string; ok: boolean; detail?: string }> = [];

    // Step 1: Create tenant config
    try {
      const config: TenantConfig = {
        tenantId: resolvedTargetTenantId,
        facilityName: body.facilityName ?? resolvedTargetTenantId,
        facilityStation: body.facilityStation ?? '',
        vistaHost: body.vistaHost ?? '127.0.0.1',
        vistaPort: body.vistaPort ?? 9430,
        vistaContext: body.vistaContext ?? 'OR CPRS GUI CHART',
        enabledModules: body.enabledModules ?? [],
        featureFlags: body.featureFlags ?? {},
        uiDefaults: body.uiDefaults ?? {
          theme: 'light',
          density: 'comfortable',
          layoutMode: 'cprs',
          initialTab: 'cover',
          enableDragReorder: false,
          themePack: 'modern-default',
        },
        noteTemplates: [],
        connectors: [],
        branding: body.branding ?? {
          logoUrl: '',
          faviconUrl: '',
          primaryColor: '',
          secondaryColor: '',
          headerText: '',
          footerText: '',
          enabled: false,
        },
        countryPackId: body.countryPackId ?? 'US',
        locale: body.locale ?? 'en',
        timezone: body.timezone ?? 'America/New_York',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertTenant(config);
      steps.push({ step: 'create_tenant_config', ok: true });
    } catch (err: any) {
      steps.push({ step: 'create_tenant_config', ok: false, detail: err?.message });
      return reply.code(500).send({ ok: false, steps, error: 'Tenant config creation failed' });
    }

    // Step 2: Seed module entitlements from SKU
    try {
      const { getActiveSkuProfile, getModuleDefinitions } =
        await import('../modules/module-registry.js');
      const { seedTenantModules } = await import('../platform/pg/repo/module-repo.js');
      const skuProfile = getActiveSkuProfile();
      const skuModules = skuProfile?.modules || Object.keys(getModuleDefinitions());
      const seeded = await seedTenantModules(resolvedTargetTenantId, skuModules, session.duz);
      steps.push({
        step: 'seed_module_entitlements',
        ok: true,
        detail: `${seeded} modules seeded`,
      });
    } catch (err: any) {
      steps.push({ step: 'seed_module_entitlements', ok: false, detail: err?.message });
    }

    // Step 3: Probe VistA connectivity (uses global VISTA_HOST/VISTA_PORT from env)
    try {
      await probeConnect(2000);
      steps.push({
        step: 'vista_connectivity_probe',
        ok: true,
        detail: `VistA broker reachable`,
      });
    } catch (err: any) {
      steps.push({
        step: 'vista_connectivity_probe',
        ok: false,
        detail: err?.message || 'VistA unreachable',
      });
    }

    // Step 4: Create billing customer (if billing provider is active)
    try {
      const { getBillingProvider } = await import('../billing/index.js');
      const provider = getBillingProvider();
      if (provider) {
        steps.push({
          step: 'billing_customer',
          ok: true,
          detail: 'Deferred to subscription creation',
        });
      } else {
        steps.push({ step: 'billing_customer', ok: true, detail: 'No billing provider active' });
      }
    } catch {
      steps.push({ step: 'billing_customer', ok: true, detail: 'Billing not configured' });
    }

    const allOk = steps.every((s) => s.ok);
    audit('config.tenant-provision', allOk ? 'success' : 'partial', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, steps },
    });

    log.info('Tenant provisioned', {
      tenantId: resolvedTargetTenantId,
      steps: steps.map((s) => `${s.step}:${s.ok}`),
    });
    return reply.code(allOk ? 201 : 207).send({
      ok: allOk,
      tenantId: resolvedTargetTenantId,
      scope: 'platform-admin',
      platformNotes: ['vista_connectivity_probe uses process-level VistA env, not tenant-specific broker settings'],
      steps,
      message: allOk
        ? `Tenant ${resolvedTargetTenantId} fully provisioned`
        : `Tenant ${resolvedTargetTenantId} provisioned with warnings`,
    });
  });

  // -- Feature Flags -----------------------------------------------

  /** GET /admin/feature-flags/:tenantId -- get feature flags */
  server.get('/admin/feature-flags/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, featureFlags: tenant.featureFlags };
  });

  /** PUT /admin/feature-flags/:tenantId -- update feature flags (partial merge) */
  server.put('/admin/feature-flags/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const flags = request.body as FeatureFlags;
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, (flags as any)?.reason);
    if (!tenantId) return reply;
    const result = updateFeatureFlags(tenantId, flags);
    if (!result) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    audit('config.feature-flag-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, flagsUpdated: Object.keys(flags) },
    });
    log.info('Feature flags updated', { tenantId, flags: Object.keys(flags) });
    return { ok: true, tenantId, featureFlags: result };
  });

  // -- UI Defaults -------------------------------------------------

  /** GET /admin/ui-defaults/:tenantId -- get UI defaults */
  server.get('/admin/ui-defaults/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, uiDefaults: tenant.uiDefaults };
  });

  /** PUT /admin/ui-defaults/:tenantId -- update UI defaults (partial merge) */
  server.put('/admin/ui-defaults/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const defaults = request.body as Partial<UIDefaults>;
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, (defaults as any)?.reason);
    if (!tenantId) return reply;
    const result = updateUIDefaults(tenantId, defaults);
    if (!result) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    audit('config.ui-defaults-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, fieldsUpdated: Object.keys(defaults) },
    });
    log.info('UI defaults updated', { tenantId });
    return { ok: true, tenantId, uiDefaults: result };
  });

  // -- Enabled Modules ---------------------------------------------

  /** GET /admin/modules/:tenantId -- get enabled modules */
  server.get('/admin/modules/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, enabledModules: tenant.enabledModules };
  });

  /** PUT /admin/modules/:tenantId -- update enabled modules */
  server.put('/admin/modules/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const { modules, reason } = request.body as { modules: ModuleId[]; reason?: string };
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, reason);
    if (!tenantId) return reply;
    const result = updateEnabledModules(tenantId, modules);
    if (!result) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    audit('config.modules-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, modules },
    });
    log.info('Enabled modules updated', { tenantId, modules });
    return { ok: true, tenantId, enabledModules: result };
  });

  // -- Note Templates ----------------------------------------------

  /** GET /admin/note-templates/:tenantId -- list note templates */
  server.get('/admin/note-templates/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, templates: tenant.noteTemplates };
  });

  /** PUT /admin/note-templates/:tenantId/:templateId -- upsert a note template */
  server.put('/admin/note-templates/:tenantId/:templateId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { templateId } = request.params as {
      tenantId: string;
      templateId: string;
    };
    const body = request.body as Partial<NoteTemplate>;
    const tenantId = resolveAdminTargetTenantId(
      request,
      reply,
      (request.params as { tenantId: string }).tenantId,
      (body as any)?.reason
    );
    if (!tenantId) return reply;

    const template: NoteTemplate = {
      id: templateId,
      title: body.title ?? templateId,
      body: body.body ?? '',
      specialty: body.specialty ?? '',
      roles: body.roles ?? [],
      active: body.active !== false,
    };

    const result = upsertNoteTemplate(tenantId, template);
    if (!result) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    audit('config.template-upsert', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, templateId },
    });
    log.info('Note template upserted', { tenantId, templateId });
    return { ok: true, tenantId, template: result };
  });

  /** DELETE /admin/note-templates/:tenantId/:templateId -- delete a note template */
  server.delete('/admin/note-templates/:tenantId/:templateId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { templateId } = request.params as {
      tenantId: string;
      templateId: string;
    };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(
      request,
      reply,
      (request.params as { tenantId: string }).tenantId,
      q.reason
    );
    if (!tenantId) return reply;
    const deleted = deleteNoteTemplate(tenantId, templateId);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Template not found' });

    audit('config.template-delete', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, templateId },
    });
    log.info('Note template deleted', { tenantId, templateId });
    return { ok: true, deleted: templateId };
  });

  // -- Connectors / Integrations -----------------------------------

  /** GET /admin/integrations/:tenantId -- list connectors with status */
  server.get('/admin/integrations/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, connectors: tenant.connectors };
  });

  /** POST /admin/integrations/:tenantId/probe -- probe all connectors */
  server.post('/admin/integrations/:tenantId/probe', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as { reason?: string } | undefined) || {};
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, body.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    const results: Array<{ id: string; status: string }> = [];
    for (const connector of tenant.connectors) {
      if (connector.type === 'vista-rpc') {
        try {
          await probeConnect();
          updateConnectorStatus(tenantId, connector.id, 'connected');
          results.push({ id: connector.id, status: 'connected' });
        } catch {
          updateConnectorStatus(tenantId, connector.id, 'disconnected');
          results.push({ id: connector.id, status: 'disconnected' });
        }
      } else {
        // For non-VistA connectors, mark as unknown (probe not implemented)
        updateConnectorStatus(tenantId, connector.id, 'unknown');
        results.push({ id: connector.id, status: 'unknown' });
      }
    }

    audit('config.connector-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: {
        tenantId,
        probeResults: results,
        probeScope: 'platform-global-vista-rpc-env-for-vista-connectors',
      },
    });
    return {
      ok: true,
      tenantId,
      results,
      scopeNotes: ['VistA connector probe uses process-level broker env, not per-tenant connector host/port'],
    };
  });

  // -- Tenant Branding -- Phase 282 --------------------------------

  /** GET /admin/branding/:tenantId -- get branding config */
  server.get('/admin/branding/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const { tenantId: requestedTenantId } = request.params as { tenantId: string };
    const q = (request.query as { reason?: string }) || {};
    const tenantId = resolveAdminTargetTenantId(request, reply, requestedTenantId, q.reason);
    if (!tenantId) return reply;
    const tenant = getTenant(tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    return { ok: true, tenantId, branding: tenant.branding };
  });

  /** PUT /admin/branding/:tenantId -- update branding config (full replace, sanitized) */
  server.put('/admin/branding/:tenantId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const body = (request.body as Partial<BrandingConfig>) || {};
    const tenantId = resolveAdminTargetTenantId(
      request,
      reply,
      (request.params as { tenantId: string }).tenantId,
      (body as any)?.reason
    );
    if (!tenantId) return reply;

    const { branding, errors } = sanitizeBranding(body);
    if (errors.length > 0) {
      return reply.code(400).send({ ok: false, errors });
    }

    const result = updateBranding(tenantId, branding);
    if (!result) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    audit('config.branding-update', 'success', auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { tenantId, enabled: branding.enabled },
    });
    log.info('Tenant branding updated', { tenantId });
    return { ok: true, tenantId, branding: result };
  });

  // -- Tenant config for client (read-only, session-based) ---------

  /** GET /admin/my-tenant -- get current user's tenant config (non-admin). */
  server.get('/admin/my-tenant', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session.tenantId) {
      return reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    }
    const tenant = getTenant(session.tenantId);
    if (!tenant) return reply.code(404).send({ ok: false, error: 'Tenant not found' });

    // System-level module entitlements (Phase 135)
    const systemModules = getEnabledModules(session.tenantId);

    // Return only client-safe fields (no vistaHost/port, no connector details)
    return {
      ok: true,
      tenant: {
        tenantId: tenant.tenantId,
        facilityName: tenant.facilityName,
        facilityStation: tenant.facilityStation,
        enabledModules: tenant.enabledModules,
        systemModules,
        featureFlags: tenant.featureFlags,
        uiDefaults: tenant.uiDefaults,
        branding: tenant.branding,
        noteTemplates: tenant.noteTemplates.filter((t) => t.active),
      },
    };
  });
}
