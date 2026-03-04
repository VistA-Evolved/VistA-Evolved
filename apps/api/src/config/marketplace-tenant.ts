/**
 * Marketplace Tenant Configuration — Phase 51.
 *
 * Enhanced tenant configuration for marketplace-ready module packaging.
 * Layers on top of the existing Phase 17A tenant-config.ts (tab-level)
 * and Phase 37C module-registry.ts (system-level modules).
 *
 * This service manages:
 *   - Per-tenant enabled system modules (marketplace toggle)
 *   - Connector settings per tenant (e.g., which clearinghouse, which PACS)
 *   - Jurisdiction pack selection (US, PH, etc.)
 *   - Safe defaults — no secrets stored in config; secrets via env vars
 *
 * Production would swap the in-memory store for a database or config service.
 */

import { log } from '../lib/logger.js';
import {
  getEnabledModules,
  setTenantModules,
  validateDependencies,
  getActiveSku,
} from '../modules/module-registry.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Supported jurisdiction packs (determines regulatory defaults). */
export type JurisdictionPack =
  | 'us' // United States — HIPAA, CMS, X12 EDI
  | 'ph' // Philippines — PhilHealth, DOH
  | 'global' // Generic — minimal regulatory assumptions
  | 'sandbox'; // Development/testing — all features, relaxed validation

/** Connector configuration (no secrets — secrets come from env vars). */
export interface ConnectorConfig {
  /** Connector type identifier (e.g., "clearinghouse", "pacs", "ehr") */
  type: string;
  /** Display name for admin UI */
  name: string;
  /** Whether this connector is active for the tenant */
  enabled: boolean;
  /** Non-secret settings (endpoint URLs, modes, etc.) */
  settings: Record<string, string | number | boolean>;
}

/** Full marketplace tenant configuration. */
export interface MarketplaceTenantConfig {
  /** Unique tenant identifier */
  tenantId: string;
  /** Human-readable facility name */
  facilityName: string;
  /** Jurisdiction pack selection */
  jurisdiction: JurisdictionPack;
  /** System-level enabled modules (marketplace toggles) */
  enabledModules: string[];
  /** Per-tenant connector configurations */
  connectors: ConnectorConfig[];
  /** Custom settings (non-secret key-value pairs) */
  customSettings: Record<string, string | number | boolean>;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Jurisdiction pack defaults                                          */
/* ------------------------------------------------------------------ */

/** Default connector templates per jurisdiction. */
const JURISDICTION_DEFAULTS: Record<
  JurisdictionPack,
  {
    connectors: ConnectorConfig[];
    settings: Record<string, string | number | boolean>;
  }
> = {
  us: {
    connectors: [
      {
        type: 'clearinghouse',
        name: 'US EDI Clearinghouse',
        enabled: true,
        settings: {
          ediVersion: '5010',
          submissionMode: 'test',
          claimFormat: '837P',
        },
      },
      {
        type: 'pacs',
        name: 'Orthanc PACS',
        enabled: true,
        settings: {
          dicomwebEnabled: true,
          ohifViewerEnabled: true,
        },
      },
    ],
    settings: {
      hipaaEnabled: true,
      ediEnabled: true,
      currencyCode: 'USD',
      dateFormat: 'MM/DD/YYYY',
    },
  },
  ph: {
    connectors: [
      {
        type: 'philhealth',
        name: 'PhilHealth eClaims',
        enabled: true,
        settings: {
          testMode: true,
          claimFormat: 'CF1-CF4',
        },
      },
      {
        type: 'pacs',
        name: 'Orthanc PACS',
        enabled: false,
        settings: {
          dicomwebEnabled: true,
        },
      },
    ],
    settings: {
      philhealthEnabled: true,
      currencyCode: 'PHP',
      dateFormat: 'DD/MM/YYYY',
    },
  },
  global: {
    connectors: [
      {
        type: 'pacs',
        name: 'Orthanc PACS',
        enabled: false,
        settings: {
          dicomwebEnabled: true,
        },
      },
    ],
    settings: {
      currencyCode: 'USD',
      dateFormat: 'YYYY-MM-DD',
    },
  },
  sandbox: {
    connectors: [
      {
        type: 'sandbox',
        name: 'Sandbox Connector (simulated)',
        enabled: true,
        settings: {
          simulatedLatencyMs: 200,
          failureRate: 0,
        },
      },
      {
        type: 'pacs',
        name: 'Orthanc PACS (dev)',
        enabled: true,
        settings: {
          dicomwebEnabled: true,
          ohifViewerEnabled: true,
        },
      },
    ],
    settings: {
      allFeaturesEnabled: true,
      currencyCode: 'USD',
      dateFormat: 'YYYY-MM-DD',
    },
  },
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const tenantConfigs = new Map<string, MarketplaceTenantConfig>();

/* ------------------------------------------------------------------ */
/* Initialization                                                      */
/* ------------------------------------------------------------------ */

/**
 * Initialize the marketplace tenant config system.
 * Seeds a "default" tenant from env vars + jurisdiction defaults.
 */
export function initMarketplaceTenantConfig(): void {
  const jurisdiction = (process.env.TENANT_JURISDICTION || 'sandbox') as JurisdictionPack;
  const facilityName = process.env.FACILITY_NAME || 'VistA-Evolved Sandbox';

  // Seed default tenant
  const defaults = JURISDICTION_DEFAULTS[jurisdiction] || JURISDICTION_DEFAULTS.sandbox;
  const defaultConfig: MarketplaceTenantConfig = {
    tenantId: 'default',
    facilityName,
    jurisdiction,
    enabledModules: getEnabledModules('default'),
    connectors: defaults.connectors,
    customSettings: defaults.settings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tenantConfigs.set('default', defaultConfig);

  log.info('Marketplace tenant config initialized', {
    defaultJurisdiction: jurisdiction,
    facilityName,
    moduleCount: defaultConfig.enabledModules.length,
    connectorCount: defaultConfig.connectors.length,
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get marketplace config for a tenant. */
export function getMarketplaceTenantConfig(tenantId: string): MarketplaceTenantConfig | undefined {
  return tenantConfigs.get(tenantId);
}

/** List all marketplace tenant configs. */
export function listMarketplaceTenants(): MarketplaceTenantConfig[] {
  return Array.from(tenantConfigs.values());
}

/**
 * Create or update a marketplace tenant config.
 * Validates module dependencies before applying.
 */
export function upsertMarketplaceTenant(
  config: Partial<MarketplaceTenantConfig> & { tenantId: string }
): { ok: boolean; config?: MarketplaceTenantConfig; errors?: string[] } {
  const existing = tenantConfigs.get(config.tenantId);
  const now = new Date().toISOString();

  // Merge with existing or create new
  const jurisdiction = config.jurisdiction || existing?.jurisdiction || 'sandbox';
  const defaults = JURISDICTION_DEFAULTS[jurisdiction] || JURISDICTION_DEFAULTS.sandbox;

  const merged: MarketplaceTenantConfig = {
    tenantId: config.tenantId,
    facilityName: config.facilityName || existing?.facilityName || 'Unnamed Facility',
    jurisdiction,
    enabledModules:
      config.enabledModules || existing?.enabledModules || getEnabledModules('default'),
    connectors: config.connectors || existing?.connectors || defaults.connectors,
    customSettings: {
      ...defaults.settings,
      ...(existing?.customSettings || {}),
      ...(config.customSettings || {}),
    },
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // Validate module dependencies
  const depErrors = validateDependencies(merged.enabledModules);
  if (depErrors.length > 0) {
    return { ok: false, errors: depErrors };
  }

  // Persist in-memory
  tenantConfigs.set(config.tenantId, merged);

  // Sync to module registry
  setTenantModules(config.tenantId, merged.enabledModules);

  log.info('Marketplace tenant config updated', {
    tenantId: config.tenantId,
    jurisdiction: merged.jurisdiction,
    moduleCount: merged.enabledModules.length,
  });

  return { ok: true, config: merged };
}

/** Delete a marketplace tenant config (cannot delete "default"). */
export function deleteMarketplaceTenant(tenantId: string): boolean {
  if (tenantId === 'default') return false;
  const deleted = tenantConfigs.delete(tenantId);
  if (deleted) {
    setTenantModules(tenantId, null); // clear module overrides
  }
  return deleted;
}

/**
 * Update only the connector settings for a tenant.
 */
export function updateTenantConnectors(
  tenantId: string,
  connectors: ConnectorConfig[]
): { ok: boolean; error?: string } {
  const existing = tenantConfigs.get(tenantId);
  if (!existing) return { ok: false, error: 'Tenant not found' };

  existing.connectors = connectors;
  existing.updatedAt = new Date().toISOString();
  return { ok: true };
}

/**
 * Update the jurisdiction pack for a tenant.
 * Resets connectors and settings to jurisdiction defaults.
 */
export function updateTenantJurisdiction(
  tenantId: string,
  jurisdiction: JurisdictionPack
): { ok: boolean; error?: string } {
  const existing = tenantConfigs.get(tenantId);
  if (!existing) return { ok: false, error: 'Tenant not found' };

  const defaults = JURISDICTION_DEFAULTS[jurisdiction] || JURISDICTION_DEFAULTS.sandbox;
  existing.jurisdiction = jurisdiction;
  existing.connectors = defaults.connectors;
  existing.customSettings = { ...defaults.settings };
  existing.updatedAt = new Date().toISOString();

  log.info('Tenant jurisdiction updated', { tenantId, jurisdiction });
  return { ok: true };
}

/**
 * Get available jurisdiction packs with descriptions.
 */
export function getAvailableJurisdictions(): Array<{
  id: JurisdictionPack;
  name: string;
  description: string;
  defaultConnectorCount: number;
}> {
  return [
    {
      id: 'us',
      name: 'United States',
      description: 'HIPAA compliance, CMS billing, X12 5010 EDI, US payer clearinghouses',
      defaultConnectorCount: JURISDICTION_DEFAULTS.us.connectors.length,
    },
    {
      id: 'ph',
      name: 'Philippines',
      description: 'PhilHealth eClaims, DOH reporting, Philippine HMO connectivity',
      defaultConnectorCount: JURISDICTION_DEFAULTS.ph.connectors.length,
    },
    {
      id: 'global',
      name: 'Global / Generic',
      description: 'Minimal regulatory assumptions, adaptable to any jurisdiction',
      defaultConnectorCount: JURISDICTION_DEFAULTS.global.connectors.length,
    },
    {
      id: 'sandbox',
      name: 'Sandbox / Development',
      description: 'All features enabled, simulated connectors, relaxed validation',
      defaultConnectorCount: JURISDICTION_DEFAULTS.sandbox.connectors.length,
    },
  ];
}

/**
 * Get a summary of all tenants for admin dashboard.
 */
export function getMarketplaceSummary(): {
  totalTenants: number;
  activeSku: string;
  jurisdictionBreakdown: Record<string, number>;
  totalConnectors: number;
} {
  const jurisdictionBreakdown: Record<string, number> = {};
  let totalConnectors = 0;

  for (const config of tenantConfigs.values()) {
    jurisdictionBreakdown[config.jurisdiction] =
      (jurisdictionBreakdown[config.jurisdiction] || 0) + 1;
    totalConnectors += config.connectors.filter((c) => c.enabled).length;
  }

  return {
    totalTenants: tenantConfigs.size,
    activeSku: getActiveSku(),
    jurisdictionBreakdown,
    totalConnectors,
  };
}
