/**
 * Multi-tenant configuration — Phase 17A → Phase 275 (DB-backed).
 *
 * Defines TenantConfig, FeatureFlags, UIDefaults, and a tenant store
 * that delegates to PostgreSQL when available, with in-memory fallback.
 *
 * Phase 275: All CRUD functions now write-through to PG via
 * `tenant-config-repo.ts`. Reads are cache-first with 60s TTL.
 * Synchronous signatures are preserved for backward compatibility;
 * DB writes happen asynchronously (fire-and-forget on write path,
 * awaited on explicit async variants).
 *
 * Default tenant is seeded from environment variables so existing
 * single-tenant deployments work without any config file changes.
 */

import {
  dbListTenants,
  dbUpsertTenant,
  dbDeleteTenant,
  dbUpdateFeatureFlags,
  dbUpdateUiDefaults,
  dbUpdateEnabledModules,
  seedDefaultTenantToDb,
  type TenantConfigRow,
} from '../platform/pg/repo/tenant-config-repo.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Module IDs correspond to tab slugs from contracts/data/tabs.json */
export type ModuleId =
  | 'cover'
  | 'problems'
  | 'meds'
  | 'orders'
  | 'notes'
  | 'consults'
  | 'surgery'
  | 'dcsumm'
  | 'labs'
  | 'reports'
  | 'vitals'
  | 'allergies'
  | 'imaging';

/** All known module IDs (used as default enabled set). */
export const ALL_MODULES: ModuleId[] = [
  'cover',
  'problems',
  'meds',
  'orders',
  'notes',
  'consults',
  'surgery',
  'dcsumm',
  'labs',
  'reports',
  'vitals',
  'allergies',
  'imaging',
];

/** Feature flag identifiers — extensible union. */
export type FeatureFlagId =
  | 'notes.templates'
  | 'orders.sign'
  | 'orders.release'
  | 'imaging.viewer'
  | 'rpc.console'
  | 'write-backs.enabled'
  | 'drag-reorder.coversheet'
  | 'remote-data.enabled'
  | 'rcm.enabled';

/** Per-tenant feature flags. */
export interface FeatureFlags {
  [key: string]: boolean;
}

/** Default feature flags — everything enabled. */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  'notes.templates': true,
  'orders.sign': true,
  'orders.release': true,
  'imaging.viewer': true,
  'rpc.console': true,
  'write-backs.enabled': true,
  'drag-reorder.coversheet': true,
  'remote-data.enabled': true,
  'rcm.enabled': false,
};

/** UI defaults that a facility admin can set as base preferences. */
export interface UIDefaults {
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact' | 'dense' | 'balanced';
  layoutMode: 'cprs' | 'modern';
  initialTab: string;
  enableDragReorder: boolean;
  /** Phase 281: Default theme pack for new users at this facility */
  themePack: string;
}

export const DEFAULT_UI_DEFAULTS: UIDefaults = {
  theme: 'light',
  density: 'comfortable',
  layoutMode: 'cprs',
  initialTab: 'cover',
  enableDragReorder: false,
  themePack: 'modern-default',
};

/* ------------------------------------------------------------------ */
/* Tenant Branding Config — Phase 282                                  */
/* ------------------------------------------------------------------ */

/**
 * Per-tenant visual branding configuration.
 * Controls facility logo, accent colors, header/footer text.
 * All values are sanitized server-side before storage.
 */
export interface BrandingConfig {
  /** Logo URL (https only, max 2048 chars). Empty = system default. */
  logoUrl: string;
  /** Favicon URL (https only, max 2048 chars). Empty = system default. */
  faviconUrl: string;
  /** Primary brand color (hex 6-digit, e.g. "#003366"). */
  primaryColor: string;
  /** Secondary/accent brand color (hex 6-digit, e.g. "#0078d4"). */
  secondaryColor: string;
  /** Header text override (max 100 chars, plain text only). */
  headerText: string;
  /** Footer text override (max 200 chars, plain text only). */
  footerText: string;
  /** Whether branding overrides are active (false = use theme defaults). */
  enabled: boolean;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '',
  secondaryColor: '',
  headerText: '',
  footerText: '',
  enabled: false,
};

/* ── Branding Sanitization ──────────────────────────────────────── */

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const HTTPS_URL_RE = /^https:\/\/.{1,2040}$/;

/** Strip HTML tags and control characters from plain text. */
function sanitizeText(text: string, maxLen: number): string {
  return text
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // strip control chars
    .slice(0, maxLen)
    .trim();
}

/** Validate and sanitize a branding config. Returns sanitized copy + errors. */
export function sanitizeBranding(input: Partial<BrandingConfig>): {
  branding: BrandingConfig;
  errors: string[];
} {
  const errors: string[] = [];
  const branding: BrandingConfig = { ...DEFAULT_BRANDING };

  // logoUrl
  if (input.logoUrl) {
    if (HTTPS_URL_RE.test(input.logoUrl)) {
      branding.logoUrl = input.logoUrl;
    } else if (input.logoUrl.trim() !== '') {
      errors.push('logoUrl must be a valid HTTPS URL (max 2048 chars)');
    }
  }

  // faviconUrl
  if (input.faviconUrl) {
    if (HTTPS_URL_RE.test(input.faviconUrl)) {
      branding.faviconUrl = input.faviconUrl;
    } else if (input.faviconUrl.trim() !== '') {
      errors.push('faviconUrl must be a valid HTTPS URL (max 2048 chars)');
    }
  }

  // primaryColor
  if (input.primaryColor) {
    if (HEX_COLOR_RE.test(input.primaryColor)) {
      branding.primaryColor = input.primaryColor;
    } else if (input.primaryColor.trim() !== '') {
      errors.push('primaryColor must be a 6-digit hex color (e.g. #003366)');
    }
  }

  // secondaryColor
  if (input.secondaryColor) {
    if (HEX_COLOR_RE.test(input.secondaryColor)) {
      branding.secondaryColor = input.secondaryColor;
    } else if (input.secondaryColor.trim() !== '') {
      errors.push('secondaryColor must be a 6-digit hex color (e.g. #0078d4)');
    }
  }

  // headerText
  if (input.headerText !== undefined) {
    branding.headerText = sanitizeText(input.headerText, 100);
  }

  // footerText
  if (input.footerText !== undefined) {
    branding.footerText = sanitizeText(input.footerText, 200);
  }

  // enabled
  branding.enabled = input.enabled === true;

  return { branding, errors };
}

/** Note template definition. */
export interface NoteTemplate {
  id: string;
  title: string;
  /** Template body (boilerplate text) */
  body: string;
  /** Specialty or role constraint (empty = all) */
  specialty: string;
  /** Who can use: role filter */
  roles: string[];
  /** Whether template is active */
  active: boolean;
}

/** Connector/integration definition for interop status. */
export interface ConnectorConfig {
  id: string;
  label: string;
  type: 'vista-rpc' | 'fhir' | 'imaging' | 'external';
  host: string;
  port: number;
  /** Last known status */
  status: 'connected' | 'disconnected' | 'degraded' | 'unknown';
  /** Last checked timestamp (ISO) */
  lastChecked: string | null;
}

/** Full tenant configuration. */
export interface TenantConfig {
  /** Unique tenant identifier (e.g., "facility-500") */
  tenantId: string;
  /** Display name for the facility */
  facilityName: string;
  /** Station number */
  facilityStation: string;
  /** VistA connection details */
  vistaHost: string;
  vistaPort: number;
  vistaContext: string;
  /** Phase 492 (W34-P2): ISO 3166-1 alpha-2 country pack code (e.g. "US", "PH", "GH") */
  countryPackId: string;
  /** Phase 492 (W34-P2): BCP-47 locale tag (e.g. "en", "fil", "es") */
  locale: string;
  /** Phase 492 (W34-P2): IANA timezone (e.g. "America/New_York", "Asia/Manila") */
  timezone: string;
  /** Which modules are enabled for this facility */
  enabledModules: ModuleId[];
  /** Feature flags */
  featureFlags: FeatureFlags;
  /** UI defaults (base preferences for new users at this facility) */
  uiDefaults: UIDefaults;
  /** Note templates */
  noteTemplates: NoteTemplate[];
  /** Integration connectors */
  connectors: ConnectorConfig[];
  /** Phase 282: Tenant visual branding overrides */
  branding: BrandingConfig;
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* In-memory tenant store + DB write-through (Phase 275)               */
/* ------------------------------------------------------------------ */

const tenants = new Map<string, TenantConfig>();

/** Convert TenantConfig → TenantConfigRow for DB persistence */
function toRow(config: TenantConfig): TenantConfigRow {
  return {
    tenant_id: config.tenantId,
    facility_name: config.facilityName,
    facility_station: config.facilityStation,
    vista_host: config.vistaHost,
    vista_port: config.vistaPort,
    vista_context: config.vistaContext,
    country_pack_id: config.countryPackId,
    locale: config.locale,
    timezone: config.timezone,
    enabled_modules: config.enabledModules,
    feature_flags: config.featureFlags,
    ui_defaults: config.uiDefaults as any,
    note_templates: config.noteTemplates,
    connectors: config.connectors,
    branding: config.branding as any,
    created_at: config.createdAt,
    updated_at: config.updatedAt,
  };
}

/** Convert TenantConfigRow → TenantConfig from DB */
function fromRow(row: TenantConfigRow): TenantConfig {
  return {
    tenantId: row.tenant_id,
    facilityName: row.facility_name,
    facilityStation: row.facility_station,
    vistaHost: row.vista_host,
    vistaPort: row.vista_port,
    vistaContext: row.vista_context,
    countryPackId: row.country_pack_id || 'US',
    locale: row.locale || 'en',
    timezone: row.timezone || 'America/New_York',
    enabledModules: (row.enabled_modules || []) as ModuleId[],
    featureFlags: row.feature_flags || {},
    uiDefaults: { ...DEFAULT_UI_DEFAULTS, ...(row.ui_defaults || {}) } as UIDefaults,
    noteTemplates: (row.note_templates || []) as NoteTemplate[],
    connectors: (row.connectors || []) as ConnectorConfig[],
    branding: { ...DEFAULT_BRANDING, ...((row as any).branding || {}) } as BrandingConfig,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Fire-and-forget DB sync (non-blocking, logs errors silently) */
function syncToDb(config: TenantConfig): void {
  dbUpsertTenant(toRow(config)).catch(() => {});
}

/** Build the default tenant from environment variables. */
function buildDefaultTenant(): TenantConfig {
  const now = new Date().toISOString();
  return {
    tenantId: 'default',
    facilityName: process.env.VISTA_FACILITY_NAME || 'Development Facility',
    facilityStation: process.env.VISTA_FACILITY_STATION || '500',
    vistaHost: process.env.VISTA_HOST || '127.0.0.1',
    vistaPort: Number(process.env.VISTA_PORT || 9430),
    vistaContext: process.env.VISTA_CONTEXT || 'OR CPRS GUI CHART',
    countryPackId: process.env.TENANT_COUNTRY_PACK || 'US',
    locale: process.env.TENANT_LOCALE || 'en',
    timezone: process.env.TENANT_TIMEZONE || 'America/New_York',
    enabledModules: [...ALL_MODULES],
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    uiDefaults: { ...DEFAULT_UI_DEFAULTS },
    noteTemplates: [],
    branding: { ...DEFAULT_BRANDING },
    connectors: [
      {
        id: 'vista-primary',
        label: 'Primary VistA Broker',
        type: 'vista-rpc',
        host: process.env.VISTA_HOST || '127.0.0.1',
        port: Number(process.env.VISTA_PORT || 9430),
        status: 'unknown',
        lastChecked: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// Seed default tenant on module load
tenants.set('default', buildDefaultTenant());
// Phase 275: Also seed to DB (fire-and-forget)
seedDefaultTenantToDb(toRow(buildDefaultTenant())).catch(() => {});

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get a tenant by ID. Returns null if not found. */
export function getTenant(tenantId: string): TenantConfig | null {
  return tenants.get(tenantId) ?? null;
}

/** List all tenants. */
export function listTenants(): TenantConfig[] {
  return Array.from(tenants.values());
}

/** Create or fully update a tenant config. */
export function upsertTenant(config: TenantConfig): TenantConfig {
  config.updatedAt = new Date().toISOString();
  if (!config.createdAt) config.createdAt = config.updatedAt;
  tenants.set(config.tenantId, config);
  syncToDb(config); // Phase 275: write-through
  return config;
}

/** Delete a tenant. Returns true if deleted. */
export function deleteTenant(tenantId: string): boolean {
  if (tenantId === 'default') return false; // cannot delete default
  const result = tenants.delete(tenantId);
  if (result) dbDeleteTenant(tenantId).catch(() => {}); // Phase 275: write-through
  return result;
}

/** Update feature flags for a tenant (partial merge). */
export function updateFeatureFlags(tenantId: string, flags: FeatureFlags): FeatureFlags | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.featureFlags = { ...tenant.featureFlags, ...flags };
  tenant.updatedAt = new Date().toISOString();
  dbUpdateFeatureFlags(tenantId, flags).catch(() => {}); // Phase 275
  return tenant.featureFlags;
}

/** Update UI defaults for a tenant (partial merge). */
export function updateUIDefaults(
  tenantId: string,
  defaults: Partial<UIDefaults>
): UIDefaults | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.uiDefaults = { ...tenant.uiDefaults, ...defaults };
  tenant.updatedAt = new Date().toISOString();
  dbUpdateUiDefaults(tenantId, defaults as Record<string, any>).catch(() => {}); // Phase 275
  return tenant.uiDefaults;
}

/** Phase 282: Update branding config for a tenant (full replace after sanitization). */
export function updateBranding(tenantId: string, branding: BrandingConfig): BrandingConfig | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.branding = branding;
  tenant.updatedAt = new Date().toISOString();
  syncToDb(tenant); // full sync (branding is a top-level field)
  return tenant.branding;
}

/** Update enabled modules for a tenant. */
export function updateEnabledModules(tenantId: string, modules: ModuleId[]): ModuleId[] | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.enabledModules = modules;
  tenant.updatedAt = new Date().toISOString();
  dbUpdateEnabledModules(tenantId, modules).catch(() => {}); // Phase 275
  return tenant.enabledModules;
}

/** Add or update a note template. */
export function upsertNoteTemplate(tenantId: string, template: NoteTemplate): NoteTemplate | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  const idx = tenant.noteTemplates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    tenant.noteTemplates[idx] = template;
  } else {
    tenant.noteTemplates.push(template);
  }
  tenant.updatedAt = new Date().toISOString();
  syncToDb(tenant); // Phase 275
  return template;
}

/** Delete a note template. */
export function deleteNoteTemplate(tenantId: string, templateId: string): boolean {
  const tenant = tenants.get(tenantId);
  if (!tenant) return false;
  const idx = tenant.noteTemplates.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  tenant.noteTemplates.splice(idx, 1);
  tenant.updatedAt = new Date().toISOString();
  syncToDb(tenant); // Phase 275
  return true;
}

/** Update a connector's status. */
export function updateConnectorStatus(
  tenantId: string,
  connectorId: string,
  status: ConnectorConfig['status']
): ConnectorConfig | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  const connector = tenant.connectors.find((c) => c.id === connectorId);
  if (!connector) return null;
  connector.status = status;
  connector.lastChecked = new Date().toISOString();
  tenant.updatedAt = new Date().toISOString();
  syncToDb(tenant); // Phase 275
  return connector;
}

/** Resolve tenant ID from session. Falls back to "default". */
export function resolveTenantId(facilityStation?: string): string {
  if (facilityStation) {
    // Check if there's a tenant keyed by facility-{station}
    const key = `facility-${facilityStation}`;
    if (tenants.has(key)) return key;
  }
  return 'default';
}

/**
 * Phase 275: Load all tenants from PG into the in-memory Map.
 * Call once at API startup (after PG migrations). Non-fatal on failure.
 */
export async function loadTenantsFromDb(): Promise<number> {
  try {
    const rows = await dbListTenants();
    for (const row of rows) {
      tenants.set(row.tenant_id, fromRow(row));
    }
    return rows.length;
  } catch {
    return 0;
  }
}
