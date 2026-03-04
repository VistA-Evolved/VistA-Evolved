/**
 * Tenant Config — PostgreSQL Repository (Phase 275)
 *
 * DB-backed CRUD for tenant_config table with in-memory TTL cache.
 * Falls back to in-memory-only mode when PG is not configured.
 *
 * Cache TTL defaults to 60s (configurable via TENANT_CONFIG_CACHE_TTL_MS).
 */

import { isPgConfigured, getPgPool } from '../pg-db.js';

/* ------------------------------------------------------------------ */
/* Types (mirror tenant-config.ts to avoid circular import)            */
/* ------------------------------------------------------------------ */

export interface TenantConfigRow {
  tenant_id: string;
  facility_name: string;
  facility_station: string;
  vista_host: string;
  vista_port: number;
  vista_context: string;
  country_pack_id: string; // Phase 492 (W34-P2)
  locale: string; // Phase 492 (W34-P2)
  timezone: string; // Phase 492 (W34-P2)
  enabled_modules: string[]; // JSONB parsed
  feature_flags: Record<string, boolean>;
  ui_defaults: Record<string, any>;
  note_templates: any[];
  connectors: any[];
  branding: Record<string, any>; // Phase 282: JSONB parsed
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const CACHE_TTL = Number(process.env.TENANT_CONFIG_CACHE_TTL_MS || 60_000);
const cache = new Map<string, { row: TenantConfigRow; ts: number }>();

function cacheGet(tenantId: string): TenantConfigRow | null {
  const entry = cache.get(tenantId);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(tenantId);
    return null;
  }
  return entry.row;
}

function cacheSet(row: TenantConfigRow): void {
  cache.set(row.tenant_id, { row, ts: Date.now() });
}

function cacheDelete(tenantId: string): void {
  cache.delete(tenantId);
}

export function invalidateCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

/* ------------------------------------------------------------------ */
/* DB helpers                                                          */
/* ------------------------------------------------------------------ */

function rowFromDb(r: any): TenantConfigRow {
  return {
    tenant_id: r.tenant_id,
    facility_name: r.facility_name,
    facility_station: r.facility_station,
    vista_host: r.vista_host,
    vista_port: Number(r.vista_port),
    vista_context: r.vista_context,
    country_pack_id: r.country_pack_id || 'US',
    locale: r.locale || 'en',
    timezone: r.timezone || 'America/New_York',
    enabled_modules:
      typeof r.enabled_modules === 'string'
        ? JSON.parse(r.enabled_modules)
        : r.enabled_modules || [],
    feature_flags:
      typeof r.feature_flags === 'string' ? JSON.parse(r.feature_flags) : r.feature_flags || {},
    ui_defaults:
      typeof r.ui_defaults === 'string' ? JSON.parse(r.ui_defaults) : r.ui_defaults || {},
    note_templates:
      typeof r.note_templates === 'string' ? JSON.parse(r.note_templates) : r.note_templates || [],
    connectors: typeof r.connectors === 'string' ? JSON.parse(r.connectors) : r.connectors || [],
    branding: typeof r.branding === 'string' ? JSON.parse(r.branding) : r.branding || {},
    created_at: r.created_at?.toISOString?.() || r.created_at || new Date().toISOString(),
    updated_at: r.updated_at?.toISOString?.() || r.updated_at || new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function dbGetTenant(tenantId: string): Promise<TenantConfigRow | null> {
  // Cache first
  const cached = cacheGet(tenantId);
  if (cached) return cached;

  if (!isPgConfigured()) return null;

  try {
    const pool = getPgPool();
    const result = await pool.query('SELECT * FROM tenant_config WHERE tenant_id = $1', [tenantId]);
    if (result.rows.length === 0) return null;
    const row = rowFromDb(result.rows[0]);
    cacheSet(row);
    return row;
  } catch {
    return null;
  }
}

export async function dbListTenants(): Promise<TenantConfigRow[]> {
  if (!isPgConfigured()) return [];

  try {
    const pool = getPgPool();
    const result = await pool.query('SELECT * FROM tenant_config ORDER BY tenant_id');
    const rows = result.rows.map(rowFromDb);
    for (const row of rows) cacheSet(row);
    return rows;
  } catch {
    return [];
  }
}

export async function dbUpsertTenant(row: TenantConfigRow): Promise<TenantConfigRow> {
  if (!isPgConfigured()) {
    cacheSet(row);
    return row;
  }

  try {
    const pool = getPgPool();
    const now = new Date().toISOString();
    row.updated_at = now;
    if (!row.created_at) row.created_at = now;

    await pool.query(
      `INSERT INTO tenant_config
        (tenant_id, facility_name, facility_station, vista_host, vista_port,
         vista_context, country_pack_id, locale, timezone,
         enabled_modules, feature_flags, ui_defaults,
         note_templates, connectors, branding, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::timestamptz,$17::timestamptz)
       ON CONFLICT (tenant_id) DO UPDATE SET
         facility_name = EXCLUDED.facility_name,
         facility_station = EXCLUDED.facility_station,
         vista_host = EXCLUDED.vista_host,
         vista_port = EXCLUDED.vista_port,
         vista_context = EXCLUDED.vista_context,
         country_pack_id = EXCLUDED.country_pack_id,
         locale = EXCLUDED.locale,
         timezone = EXCLUDED.timezone,
         enabled_modules = EXCLUDED.enabled_modules,
         feature_flags = EXCLUDED.feature_flags,
         ui_defaults = EXCLUDED.ui_defaults,
         note_templates = EXCLUDED.note_templates,
         connectors = EXCLUDED.connectors,
         branding = EXCLUDED.branding,
         updated_at = EXCLUDED.updated_at`,
      [
        row.tenant_id,
        row.facility_name,
        row.facility_station,
        row.vista_host,
        row.vista_port,
        row.vista_context,
        row.country_pack_id || 'US',
        row.locale || 'en',
        row.timezone || 'America/New_York',
        JSON.stringify(row.enabled_modules),
        JSON.stringify(row.feature_flags),
        JSON.stringify(row.ui_defaults),
        JSON.stringify(row.note_templates),
        JSON.stringify(row.connectors),
        JSON.stringify(row.branding || {}),
        row.created_at,
        row.updated_at,
      ]
    );
    cacheSet(row);
    return row;
  } catch {
    // Fallback: cache-only on PG failure
    cacheSet(row);
    return row;
  }
}

export async function dbDeleteTenant(tenantId: string): Promise<boolean> {
  cacheDelete(tenantId);

  if (!isPgConfigured()) return true;

  try {
    const pool = getPgPool();
    const result = await pool.query('DELETE FROM tenant_config WHERE tenant_id = $1', [tenantId]);
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function dbUpdateFeatureFlags(
  tenantId: string,
  flags: Record<string, boolean>
): Promise<Record<string, boolean> | null> {
  if (!isPgConfigured()) return null;

  try {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE tenant_config
       SET feature_flags = feature_flags || $2::jsonb,
           updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING feature_flags`,
      [tenantId, JSON.stringify(flags)]
    );
    if (result.rows.length === 0) return null;
    const merged =
      typeof result.rows[0].feature_flags === 'string'
        ? JSON.parse(result.rows[0].feature_flags)
        : result.rows[0].feature_flags;
    cacheDelete(tenantId);
    return merged;
  } catch {
    return null;
  }
}

export async function dbUpdateUiDefaults(
  tenantId: string,
  defaults: Record<string, any>
): Promise<Record<string, any> | null> {
  if (!isPgConfigured()) return null;

  try {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE tenant_config
       SET ui_defaults = ui_defaults || $2::jsonb,
           updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING ui_defaults`,
      [tenantId, JSON.stringify(defaults)]
    );
    if (result.rows.length === 0) return null;
    const merged =
      typeof result.rows[0].ui_defaults === 'string'
        ? JSON.parse(result.rows[0].ui_defaults)
        : result.rows[0].ui_defaults;
    cacheDelete(tenantId);
    return merged;
  } catch {
    return null;
  }
}

export async function dbUpdateEnabledModules(
  tenantId: string,
  modules: string[]
): Promise<string[] | null> {
  if (!isPgConfigured()) return null;

  try {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE tenant_config
       SET enabled_modules = $2::jsonb,
           updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING enabled_modules`,
      [tenantId, JSON.stringify(modules)]
    );
    if (result.rows.length === 0) return null;
    cacheDelete(tenantId);
    return typeof result.rows[0].enabled_modules === 'string'
      ? JSON.parse(result.rows[0].enabled_modules)
      : result.rows[0].enabled_modules;
  } catch {
    return null;
  }
}

/**
 * Seed default tenant to PG if not present. Called at API startup.
 */
export async function seedDefaultTenantToDb(defaultRow: TenantConfigRow): Promise<void> {
  if (!isPgConfigured()) return;

  try {
    const pool = getPgPool();
    const result = await pool.query('SELECT tenant_id FROM tenant_config WHERE tenant_id = $1', [
      defaultRow.tenant_id,
    ]);
    if (result.rows.length === 0) {
      await dbUpsertTenant(defaultRow);
    }
  } catch {
    // Non-fatal: will fall back to in-memory
  }
}
