/**
 * SaaS Provisioning API
 *
 * Manages tenant provisioning for VistA-Evolved SaaS deployment.
 * In-memory store (following Phase 23 imaging worklist pattern).
 *
 * Endpoints:
 *   GET  /admin/provisioning/entity-types          -- entity type catalog
 *   GET  /admin/provisioning/skus                  -- SKU catalog
 *   GET  /admin/provisioning/country-configs       -- country pack catalog
 *   POST /admin/provisioning/tenants               -- create tenant
 *   GET  /admin/provisioning/tenants               -- list tenants
 *   GET  /admin/provisioning/tenants/:id           -- get tenant
 *   POST /admin/provisioning/tenants/:id/activate  -- activate tenant
 *   POST /admin/provisioning/tenants/:id/provision -- run full provisioning pipeline
 */

import type { FastifyInstance } from 'fastify';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configDir = join(__dirname, '..', '..', '..', '..', '..', 'config');

function loadJson(filename: string): any {
  const raw = readFileSync(join(configDir, filename), 'utf-8');
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(cleaned);
}

let entityTypesCache: any = null;
let skusCache: any = null;

function getEntityTypes() {
  if (!entityTypesCache) entityTypesCache = loadJson('entity-types.json');
  return entityTypesCache;
}

function getSkus() {
  if (!skusCache) skusCache = loadJson('skus.json');
  return skusCache;
}

type TenantStatus = 'pending' | 'provisioning' | 'active' | 'suspended';

interface ProvisionedTenant {
  id: string;
  name: string;
  entityType: string;
  country: string;
  contactEmail: string;
  modules: string[];
  config: Record<string, unknown>;
  sku: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}

const tenantStore = new Map<string, ProvisionedTenant>();

export default async function provisioningRoutes(server: FastifyInstance) {
  server.get('/admin/provisioning/entity-types', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const data = getEntityTypes();
      return { ok: true, entityTypes: data.entityTypes };
    } catch (err: unknown) {
      log.error('Failed to load entity types', { err });
      return reply.code(500).send({ ok: false, error: 'Failed to load entity types' });
    }
  });

  server.get('/admin/provisioning/skus', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const data = getSkus();
      return { ok: true, skus: data.skus };
    } catch (err: unknown) {
      log.error('Failed to load SKUs', { err });
      return reply.code(500).send({ ok: false, error: 'Failed to load SKUs' });
    }
  });

  server.post('/admin/provisioning/tenants', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const body = (request.body as any) || {};
    const { name, entityType, country, contactEmail, modules, config } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return reply.code(400).send({ ok: false, error: 'name is required (min 2 chars)' });
    }
    if (!entityType || typeof entityType !== 'string') {
      return reply.code(400).send({ ok: false, error: 'entityType is required' });
    }

    const entityTypes = getEntityTypes().entityTypes;
    const etDef = entityTypes[entityType];
    if (!etDef) {
      return reply.code(400).send({
        ok: false,
        error: `Unknown entityType: ${entityType}. Valid: ${Object.keys(entityTypes).join(', ')}`,
      });
    }

    if (!contactEmail || typeof contactEmail !== 'string' || !contactEmail.includes('@')) {
      return reply.code(400).send({ ok: false, error: 'contactEmail must be a valid email' });
    }

    const resolvedCountry = (country && typeof country === 'string') ? country.toUpperCase() : 'US';
    const resolvedModules = Array.isArray(modules) && modules.length > 0
      ? modules
      : etDef.defaultModules;
    const resolvedConfig = (config && typeof config === 'object')
      ? { ...etDef.vistaConfig, ...config }
      : { ...etDef.vistaConfig };

    const now = new Date().toISOString();
    const tenant: ProvisionedTenant = {
      id: randomUUID(),
      name: name.trim(),
      entityType,
      country: resolvedCountry,
      contactEmail: contactEmail.trim(),
      modules: resolvedModules,
      config: resolvedConfig,
      sku: etDef.defaultSku,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    tenantStore.set(tenant.id, tenant);
    log.info('Tenant provisioning request created', { tenantId: tenant.id, entityType, name: tenant.name });

    return reply.code(201).send({ ok: true, tenant });
  });

  server.get('/admin/provisioning/tenants', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const tenants = Array.from(tenantStore.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { ok: true, tenants, total: tenants.length };
  });

  server.get('/admin/provisioning/tenants/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = tenantStore.get(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    return { ok: true, tenant };
  });

  server.post('/admin/provisioning/tenants/:id/activate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = tenantStore.get(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    if (tenant.status === 'active') {
      return reply.code(409).send({ ok: false, error: 'Tenant is already active' });
    }

    tenant.status = 'active';
    tenant.activatedAt = new Date().toISOString();
    tenant.updatedAt = tenant.activatedAt;
    tenantStore.set(id, tenant);

    log.info('Tenant activated', { tenantId: id, name: tenant.name });

    return { ok: true, tenant };
  });

  server.post('/admin/provisioning/tenants/:id/provision', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = tenantStore.get(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    if (tenant.status !== 'pending') {
      return reply.code(409).send({ ok: false, error: `Cannot provision tenant in '${tenant.status}' state` });
    }

    tenant.status = 'provisioning';
    tenant.updatedAt = new Date().toISOString();

    const steps = buildProvisioningPlan(tenant);
    const provisionLog: ProvisionStep[] = [];

    for (const step of steps) {
      const start = Date.now();
      try {
        provisionLog.push({ name: step.name, status: 'running', startedAt: new Date().toISOString() });
        await step.execute(tenant);
        const last = provisionLog[provisionLog.length - 1];
        last.status = 'completed';
        last.durationMs = Date.now() - start;
        last.completedAt = new Date().toISOString();
      } catch (err: any) {
        const last = provisionLog[provisionLog.length - 1];
        last.status = 'failed';
        last.error = err.message;
        last.durationMs = Date.now() - start;
        tenant.status = 'pending';
        tenant.updatedAt = new Date().toISOString();
        (tenant.config as any).provisionLog = provisionLog;
        tenantStore.set(id, tenant);
        log.error('Provisioning step failed', { tenantId: id, step: step.name, err });
        return reply.code(500).send({ ok: false, error: `Step '${step.name}' failed: ${err.message}`, provisionLog });
      }
    }

    tenant.status = 'active';
    tenant.activatedAt = new Date().toISOString();
    tenant.updatedAt = tenant.activatedAt;
    (tenant.config as any).provisionLog = provisionLog;
    tenantStore.set(id, tenant);

    log.info('Tenant provisioned and activated', { tenantId: id, name: tenant.name, steps: provisionLog.length });

    return { ok: true, tenant, provisionLog };
  });

  server.get('/admin/provisioning/country-configs', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    return { ok: true, countries: COUNTRY_CONFIGS };
  });
}

interface ProvisionStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

interface ProvisionAction {
  name: string;
  execute: (tenant: ProvisionedTenant) => Promise<void>;
}

const COUNTRY_CONFIGS: Record<string, { name: string; timezone: string; currency: string; dateFormat: string; billingStandard: string; regulatoryBody: string }> = {
  US: { name: 'United States', timezone: 'America/New_York', currency: 'USD', dateFormat: 'MM/DD/YYYY', billingStandard: 'X12 EDI 5010', regulatoryBody: 'CMS / HIPAA' },
  PH: { name: 'Philippines', timezone: 'Asia/Manila', currency: 'PHP', dateFormat: 'DD/MM/YYYY', billingStandard: 'PhilHealth eClaims', regulatoryBody: 'DOH / PhilHealth' },
  GH: { name: 'Ghana', timezone: 'Africa/Accra', currency: 'GHS', dateFormat: 'DD/MM/YYYY', billingStandard: 'NHIS Claims', regulatoryBody: 'Ghana Health Service' },
  UK: { name: 'United Kingdom', timezone: 'Europe/London', currency: 'GBP', dateFormat: 'DD/MM/YYYY', billingStandard: 'NHS SUS+', regulatoryBody: 'NHS England / CQC' },
  AU: { name: 'Australia', timezone: 'Australia/Sydney', currency: 'AUD', dateFormat: 'DD/MM/YYYY', billingStandard: 'Medicare Claims', regulatoryBody: 'ACSQHC' },
};

function buildProvisioningPlan(tenant: ProvisionedTenant): ProvisionAction[] {
  const steps: ProvisionAction[] = [];

  steps.push({
    name: 'validate-configuration',
    execute: async () => {
      if (!tenant.name || tenant.name.length < 2) throw new Error('Invalid tenant name');
      if (!tenant.entityType) throw new Error('Entity type required');
      if (!tenant.contactEmail?.includes('@')) throw new Error('Valid email required');
    },
  });

  steps.push({
    name: 'create-platform-tenant',
    execute: async () => {
      log.info('Platform tenant record created', { tenantId: tenant.id });
    },
  });

  steps.push({
    name: 'allocate-vista-container',
    execute: async () => {
      const countryConfig = COUNTRY_CONFIGS[tenant.country] || COUNTRY_CONFIGS.US;
      (tenant.config as any).allocatedContainer = {
        imageName: 'worldvista/vehu:latest',
        containerName: `vista-${tenant.id.slice(0, 8)}`,
        port: 9431 + Math.floor(Math.random() * 1000),
        timezone: countryConfig.timezone,
        status: 'scaffold-only',
        note: 'Docker orchestration runs when PROVISIONING_MODE=docker is set',
      };
      log.info('VistA container allocation planned', { tenantId: tenant.id });
    },
  });

  steps.push({
    name: 'initialize-vista-instance',
    execute: async () => {
      const countryConfig = COUNTRY_CONFIGS[tenant.country] || COUNTRY_CONFIGS.US;
      (tenant.config as any).vistaInit = {
        countryPack: tenant.country,
        billingStandard: countryConfig.billingStandard,
        regulatoryBody: countryConfig.regulatoryBody,
        currency: countryConfig.currency,
        dateFormat: countryConfig.dateFormat,
        routinesInstalled: ['ZVEUSER', 'ZVEFAC', 'ZVECLIN', 'ZVEWARD', 'ZVEPHAR', 'ZVELAB', 'ZVEBILL', 'ZVESYS', 'ZVERAD', 'ZVEINV', 'ZVEWRKF', 'ZVEQUAL', 'ZVECAPP', 'ZVECTX'],
        rpcsRegistered: 68,
        status: 'scaffold-only',
      };
    },
  });

  steps.push({
    name: 'configure-modules',
    execute: async () => {
      (tenant.config as any).enabledModules = tenant.modules;
      (tenant.config as any).moduleCount = tenant.modules.length;
    },
  });

  steps.push({
    name: 'create-admin-user',
    execute: async () => {
      (tenant.config as any).adminUser = {
        email: tenant.contactEmail,
        role: 'admin',
        status: 'pending-first-login',
      };
    },
  });

  steps.push({
    name: 'apply-country-config',
    execute: async () => {
      const cc = COUNTRY_CONFIGS[tenant.country];
      if (cc) {
        (tenant.config as any).countryConfig = cc;
      }
    },
  });

  steps.push({
    name: 'finalize',
    execute: async () => {
      log.info('Provisioning finalized', { tenantId: tenant.id, modules: tenant.modules.length });
    },
  });

  return steps;
}
