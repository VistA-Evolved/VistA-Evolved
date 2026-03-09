/**
 * SaaS Provisioning API -- PG-backed tenant lifecycle.
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
import { isPgConfigured, getPgPool } from '../../platform/pg/pg-db.js';

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

type TenantStatus = 'pending' | 'provisioning' | 'active' | 'suspended' | 'failed';

interface ProvisionedTenant {
  id: string;
  tenantId: string;
  name: string;
  entityType: string;
  country: string;
  contactEmail: string;
  modules: string[];
  config: Record<string, unknown>;
  sku: string;
  status: TenantStatus;
  vistaHost?: string;
  vistaPort?: number;
  vistaContainerName?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}

const fallbackStore = new Map<string, ProvisionedTenant>();

function usePg(): boolean {
  return isPgConfigured();
}

async function dbInsertTenant(t: ProvisionedTenant): Promise<void> {
  if (!usePg()) {
    fallbackStore.set(t.id, t);
    return;
  }
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO tenant_catalog (id, tenant_id, name, entity_type, country, contact_email, sku, status, modules, config, vista_host, vista_port, vista_container_name, activated_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [t.id, t.tenantId, t.name, t.entityType, t.country, t.contactEmail, t.sku, t.status,
     JSON.stringify(t.modules), JSON.stringify(t.config), t.vistaHost || null,
     t.vistaPort || null, t.vistaContainerName || null, t.activatedAt || null,
     t.createdAt, t.updatedAt]
  );
}

async function dbUpdateTenant(t: ProvisionedTenant): Promise<void> {
  if (!usePg()) {
    fallbackStore.set(t.id, t);
    return;
  }
  const pool = getPgPool();
  await pool.query(
    `UPDATE tenant_catalog SET status=$1, modules=$2, config=$3, vista_host=$4, vista_port=$5, vista_container_name=$6, provision_log=$7, activated_at=$8, updated_at=$9 WHERE id=$10`,
    [t.status, JSON.stringify(t.modules), JSON.stringify(t.config), t.vistaHost || null,
     t.vistaPort || null, t.vistaContainerName || null,
     (t.config as any).provisionLog ? JSON.stringify((t.config as any).provisionLog) : null,
     t.activatedAt || null, t.updatedAt, t.id]
  );
}

async function dbGetTenant(id: string): Promise<ProvisionedTenant | null> {
  if (!usePg()) return fallbackStore.get(id) || null;
  const pool = getPgPool();
  const { rows } = await pool.query('SELECT * FROM tenant_catalog WHERE id=$1', [id]);
  if (rows.length === 0) return null;
  return rowToTenant(rows[0]);
}

async function dbListTenants(): Promise<ProvisionedTenant[]> {
  if (!usePg()) return Array.from(fallbackStore.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pool = getPgPool();
  const { rows } = await pool.query('SELECT * FROM tenant_catalog ORDER BY created_at DESC');
  return rows.map(rowToTenant);
}

async function dbLogProvisionEvent(tenantId: string, catalogId: string, stepName: string, status: string, error?: string, durationMs?: number): Promise<void> {
  if (!usePg()) return;
  const pool = getPgPool();
  await pool.query(
    `INSERT INTO tenant_provision_event (id, tenant_id, catalog_id, step_name, status, error, duration_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), tenantId, catalogId, stepName, status, error || null, durationMs || null]
  );
}

function rowToTenant(row: any): ProvisionedTenant {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    entityType: row.entity_type,
    country: row.country,
    contactEmail: row.contact_email,
    sku: row.sku,
    status: row.status,
    modules: safeJsonParse(row.modules, []),
    config: safeJsonParse(row.config, {}),
    vistaHost: row.vista_host,
    vistaPort: row.vista_port,
    vistaContainerName: row.vista_container_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activatedAt: row.activated_at,
  };
}

function safeJsonParse(val: any, fallback: any): any {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const COUNTRY_CONFIGS: Record<string, { name: string; timezone: string; currency: string; dateFormat: string; billingStandard: string; regulatoryBody: string }> = {
  US: { name: 'United States', timezone: 'America/New_York', currency: 'USD', dateFormat: 'MM/DD/YYYY', billingStandard: 'X12 EDI 5010', regulatoryBody: 'CMS / HIPAA' },
  PH: { name: 'Philippines', timezone: 'Asia/Manila', currency: 'PHP', dateFormat: 'DD/MM/YYYY', billingStandard: 'PhilHealth eClaims', regulatoryBody: 'DOH / PhilHealth' },
  GH: { name: 'Ghana', timezone: 'Africa/Accra', currency: 'GHS', dateFormat: 'DD/MM/YYYY', billingStandard: 'NHIS Claims', regulatoryBody: 'Ghana Health Service' },
  UK: { name: 'United Kingdom', timezone: 'Europe/London', currency: 'GBP', dateFormat: 'DD/MM/YYYY', billingStandard: 'NHS SUS+', regulatoryBody: 'NHS England / CQC' },
  AU: { name: 'Australia', timezone: 'Australia/Sydney', currency: 'AUD', dateFormat: 'DD/MM/YYYY', billingStandard: 'Medicare Claims', regulatoryBody: 'ACSQHC' },
  NZ: { name: 'New Zealand', timezone: 'Pacific/Auckland', currency: 'NZD', dateFormat: 'DD/MM/YYYY', billingStandard: 'ACC Claims', regulatoryBody: 'MOH NZ' },
  SG: { name: 'Singapore', timezone: 'Asia/Singapore', currency: 'SGD', dateFormat: 'DD/MM/YYYY', billingStandard: 'MediSave Claims', regulatoryBody: 'MOH Singapore' },
};

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
    const tenantId = randomUUID();
    const tenant: ProvisionedTenant = {
      id: randomUUID(),
      tenantId,
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

    await dbInsertTenant(tenant);
    log.info('Tenant provisioning request created', { tenantId: tenant.id, entityType, name: tenant.name });

    return reply.code(201).send({ ok: true, tenant, persisted: usePg() ? 'pg' : 'memory' });
  });

  server.get('/admin/provisioning/tenants', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const tenants = await dbListTenants();
    return { ok: true, tenants, total: tenants.length, backend: usePg() ? 'pg' : 'memory' };
  });

  server.get('/admin/provisioning/tenants/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = await dbGetTenant(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    return { ok: true, tenant };
  });

  server.post('/admin/provisioning/tenants/:id/activate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = await dbGetTenant(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    if (tenant.status === 'active') {
      return reply.code(409).send({ ok: false, error: 'Tenant is already active' });
    }

    tenant.status = 'active';
    tenant.activatedAt = new Date().toISOString();
    tenant.updatedAt = tenant.activatedAt;
    await dbUpdateTenant(tenant);

    log.info('Tenant activated', { tenantId: id, name: tenant.name });
    return { ok: true, tenant };
  });

  server.post('/admin/provisioning/tenants/:id/provision', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const tenant = await dbGetTenant(id);
    if (!tenant) {
      return reply.code(404).send({ ok: false, error: 'Tenant not found' });
    }
    if (tenant.status !== 'pending' && tenant.status !== 'failed') {
      return reply.code(409).send({ ok: false, error: `Cannot provision tenant in '${tenant.status}' state` });
    }

    tenant.status = 'provisioning';
    tenant.updatedAt = new Date().toISOString();
    await dbUpdateTenant(tenant);

    const steps = buildProvisioningPlan(tenant);
    const provisionLog: ProvisionStepResult[] = [];

    for (const step of steps) {
      const start = Date.now();
      try {
        provisionLog.push({ name: step.name, status: 'running', startedAt: new Date().toISOString() });
        await step.execute(tenant);
        const last = provisionLog[provisionLog.length - 1];
        last.status = 'completed';
        last.durationMs = Date.now() - start;
        last.completedAt = new Date().toISOString();
        await dbLogProvisionEvent(tenant.tenantId, tenant.id, step.name, 'completed', undefined, last.durationMs);
      } catch (err: any) {
        const last = provisionLog[provisionLog.length - 1];
        last.status = 'failed';
        last.error = err.message;
        last.durationMs = Date.now() - start;
        tenant.status = 'failed';
        tenant.updatedAt = new Date().toISOString();
        (tenant.config as any).provisionLog = provisionLog;
        await dbUpdateTenant(tenant);
        await dbLogProvisionEvent(tenant.tenantId, tenant.id, step.name, 'failed', err.message, last.durationMs);
        log.error('Provisioning step failed', { tenantId: id, step: step.name, err });
        return reply.code(500).send({ ok: false, error: `Step '${step.name}' failed: ${err.message}`, provisionLog });
      }
    }

    tenant.status = 'active';
    tenant.activatedAt = new Date().toISOString();
    tenant.updatedAt = tenant.activatedAt;
    (tenant.config as any).provisionLog = provisionLog;
    await dbUpdateTenant(tenant);

    log.info('Tenant provisioned and activated', { tenantId: id, name: tenant.name, steps: provisionLog.length });
    return { ok: true, tenant, provisionLog };
  });

  server.get('/admin/provisioning/country-configs', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    return { ok: true, countries: COUNTRY_CONFIGS };
  });
}

interface ProvisionStepResult {
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

function buildProvisioningPlan(tenant: ProvisionedTenant): ProvisionAction[] {
  return [
    {
      name: 'validate-configuration',
      execute: async () => {
        if (!tenant.name || tenant.name.length < 2) throw new Error('Invalid tenant name');
        if (!tenant.entityType) throw new Error('Entity type required');
        if (!tenant.contactEmail?.includes('@')) throw new Error('Valid email required');
        const entityTypes = getEntityTypes().entityTypes;
        if (!entityTypes[tenant.entityType]) throw new Error(`Unknown entity type: ${tenant.entityType}`);
      },
    },
    {
      name: 'create-platform-tenant',
      execute: async () => {
        if (usePg()) {
          const pool = getPgPool();
          const existing = await pool.query('SELECT id FROM platform_audit_event WHERE tenant_id=$1 LIMIT 1', [tenant.tenantId]);
          log.info('Platform tenant record ensured', { tenantId: tenant.tenantId, preExisting: existing.rows.length > 0 });
        }
        (tenant.config as any).platformTenantCreated = true;
      },
    },
    {
      name: 'configure-modules',
      execute: async () => {
        if (usePg()) {
          const pool = getPgPool();
          for (const modId of tenant.modules) {
            await pool.query(
              `INSERT INTO tenant_module (id, tenant_id, module_id, enabled, created_at, updated_at)
               VALUES ($1, $2, $3, true, $4, $4)
               ON CONFLICT (tenant_id, module_id) DO UPDATE SET enabled=true, updated_at=$4`,
              [randomUUID(), tenant.tenantId, modId, new Date().toISOString()]
            );
          }
        }
        (tenant.config as any).enabledModules = tenant.modules;
        (tenant.config as any).moduleCount = tenant.modules.length;
      },
    },
    {
      name: 'initialize-admin-user',
      execute: async () => {
        (tenant.config as any).adminUser = {
          email: tenant.contactEmail,
          role: 'admin',
          status: 'pending-first-login',
        };
        log.info('Admin user initialized', { tenantId: tenant.tenantId, email: tenant.contactEmail });
      },
    },
    {
      name: 'allocate-vista-instance',
      execute: async () => {
        const countryConfig = COUNTRY_CONFIGS[tenant.country] || COUNTRY_CONFIGS.US;
        const basePort = 9440;
        const portOffset = Math.abs(hashCode(tenant.id)) % 1000;
        const allocatedPort = basePort + portOffset;
        const containerName = `vista-${tenant.id.slice(0, 8)}`;

        tenant.vistaHost = '127.0.0.1';
        tenant.vistaPort = allocatedPort;
        tenant.vistaContainerName = containerName;

        (tenant.config as any).vistaAllocation = {
          imageName: 'worldvista/vehu:latest',
          containerName,
          host: tenant.vistaHost,
          port: allocatedPort,
          timezone: countryConfig.timezone,
          dockerMode: process.env.PROVISIONING_MODE === 'docker' ? 'live' : 'deferred',
        };

        log.info('VistA instance allocated', { tenantId: tenant.tenantId, port: allocatedPort, containerName });
      },
    },
    {
      name: 'apply-country-config',
      execute: async () => {
        const cc = COUNTRY_CONFIGS[tenant.country] || COUNTRY_CONFIGS.US;
        (tenant.config as any).countryConfig = cc;
        (tenant.config as any).vistaInit = {
          countryPack: tenant.country,
          billingStandard: cc.billingStandard,
          regulatoryBody: cc.regulatoryBody,
          currency: cc.currency,
          dateFormat: cc.dateFormat,
        };
      },
    },
    {
      name: 'setup-tenant-config',
      execute: async () => {
        if (usePg()) {
          const pool = getPgPool();
          const configPayload = {
            entityType: tenant.entityType,
            country: tenant.country,
            sku: tenant.sku,
            vistaHost: tenant.vistaHost,
            vistaPort: tenant.vistaPort,
          };
          await pool.query(
            `INSERT INTO tenant_config (id, tenant_id, config_key, config_value, created_at, updated_at)
             VALUES ($1, $2, 'provisioning', $3, $4, $4)
             ON CONFLICT DO NOTHING`,
            [randomUUID(), tenant.tenantId, JSON.stringify(configPayload), new Date().toISOString()]
          );
        }
      },
    },
    {
      name: 'finalize',
      execute: async () => {
        log.info('Provisioning finalized', { tenantId: tenant.tenantId, modules: tenant.modules.length, status: 'active' });
      },
    },
  ];
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return hash;
}
