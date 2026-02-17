/**
 * Multi-tenant configuration — Phase 17A.
 *
 * Defines TenantConfig, FeatureFlags, UIDefaults, and an in-memory TenantStore.
 * Default tenant is seeded from environment variables so existing single-tenant
 * deployments work without any config file changes.
 *
 * Production would swap the in-memory store for a database or config service.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Module IDs correspond to tab slugs from contracts/data/tabs.json */
export type ModuleId =
  | "cover"
  | "problems"
  | "meds"
  | "orders"
  | "notes"
  | "consults"
  | "surgery"
  | "dcsumm"
  | "labs"
  | "reports"
  | "vitals"
  | "allergies"
  | "imaging";

/** All known module IDs (used as default enabled set). */
export const ALL_MODULES: ModuleId[] = [
  "cover", "problems", "meds", "orders", "notes", "consults",
  "surgery", "dcsumm", "labs", "reports", "vitals", "allergies", "imaging",
];

/** Feature flag identifiers — extensible union. */
export type FeatureFlagId =
  | "notes.templates"
  | "orders.sign"
  | "orders.release"
  | "imaging.viewer"
  | "rpc.console"
  | "write-backs.enabled"
  | "drag-reorder.coversheet"
  | "remote-data.enabled";

/** Per-tenant feature flags. */
export interface FeatureFlags {
  [key: string]: boolean;
}

/** Default feature flags — everything enabled. */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  "notes.templates": true,
  "orders.sign": true,
  "orders.release": true,
  "imaging.viewer": true,
  "rpc.console": true,
  "write-backs.enabled": true,
  "drag-reorder.coversheet": true,
  "remote-data.enabled": true,
};

/** UI defaults that a facility admin can set as base preferences. */
export interface UIDefaults {
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact" | "dense" | "balanced";
  layoutMode: "cprs" | "modern";
  initialTab: string;
  enableDragReorder: boolean;
}

export const DEFAULT_UI_DEFAULTS: UIDefaults = {
  theme: "light",
  density: "comfortable",
  layoutMode: "cprs",
  initialTab: "cover",
  enableDragReorder: false,
};

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
  type: "vista-rpc" | "fhir" | "imaging" | "external";
  host: string;
  port: number;
  /** Last known status */
  status: "connected" | "disconnected" | "degraded" | "unknown";
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
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* In-memory tenant store                                              */
/* ------------------------------------------------------------------ */

const tenants = new Map<string, TenantConfig>();

/** Build the default tenant from environment variables. */
function buildDefaultTenant(): TenantConfig {
  const now = new Date().toISOString();
  return {
    tenantId: "default",
    facilityName: process.env.VISTA_FACILITY_NAME || "Development Facility",
    facilityStation: process.env.VISTA_FACILITY_STATION || "500",
    vistaHost: process.env.VISTA_HOST || "127.0.0.1",
    vistaPort: Number(process.env.VISTA_PORT || 9430),
    vistaContext: process.env.VISTA_CONTEXT || "OR CPRS GUI CHART",
    enabledModules: [...ALL_MODULES],
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    uiDefaults: { ...DEFAULT_UI_DEFAULTS },
    noteTemplates: [],
    connectors: [
      {
        id: "vista-primary",
        label: "Primary VistA Broker",
        type: "vista-rpc",
        host: process.env.VISTA_HOST || "127.0.0.1",
        port: Number(process.env.VISTA_PORT || 9430),
        status: "unknown",
        lastChecked: null,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// Seed default tenant on module load
tenants.set("default", buildDefaultTenant());

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
  return config;
}

/** Delete a tenant. Returns true if deleted. */
export function deleteTenant(tenantId: string): boolean {
  if (tenantId === "default") return false; // cannot delete default
  return tenants.delete(tenantId);
}

/** Update feature flags for a tenant (partial merge). */
export function updateFeatureFlags(tenantId: string, flags: FeatureFlags): FeatureFlags | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.featureFlags = { ...tenant.featureFlags, ...flags };
  tenant.updatedAt = new Date().toISOString();
  return tenant.featureFlags;
}

/** Update UI defaults for a tenant (partial merge). */
export function updateUIDefaults(tenantId: string, defaults: Partial<UIDefaults>): UIDefaults | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.uiDefaults = { ...tenant.uiDefaults, ...defaults };
  tenant.updatedAt = new Date().toISOString();
  return tenant.uiDefaults;
}

/** Update enabled modules for a tenant. */
export function updateEnabledModules(tenantId: string, modules: ModuleId[]): ModuleId[] | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  tenant.enabledModules = modules;
  tenant.updatedAt = new Date().toISOString();
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
  return true;
}

/** Update a connector's status. */
export function updateConnectorStatus(
  tenantId: string,
  connectorId: string,
  status: ConnectorConfig["status"],
): ConnectorConfig | null {
  const tenant = tenants.get(tenantId);
  if (!tenant) return null;
  const connector = tenant.connectors.find((c) => c.id === connectorId);
  if (!connector) return null;
  connector.status = status;
  connector.lastChecked = new Date().toISOString();
  tenant.updatedAt = new Date().toISOString();
  return connector;
}

/** Resolve tenant ID from session. Falls back to "default". */
export function resolveTenantId(facilityStation?: string): string {
  if (facilityStation) {
    // Check if there's a tenant keyed by facility-{station}
    const key = `facility-${facilityStation}`;
    if (tenants.has(key)) return key;
  }
  return "default";
}
