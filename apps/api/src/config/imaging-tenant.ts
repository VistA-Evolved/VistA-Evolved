/**
 * Multi-tenant Imaging Configuration — Phase 24.
 *
 * Maps tenantId/facilityId to imaging infrastructure endpoints.
 * Each tenant can have its own Orthanc instance (or namespace),
 * viewer base, and AE allowlists.
 *
 * VistA-first: In production, VistA station numbers map to
 * facilityIds. The tenant boundary aligns with VistA's
 * division/station number model.
 *
 * Phase 24: In-memory config with env-var overrides.
 * Phase 24C+: External config service or database-backed.
 */

import { IMAGING_CONFIG } from "../config/server-config.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export interface TenantImagingConfig {
  tenantId: string;
  facilityId: string;
  facilityName: string;
  /** Internal Orthanc base URL (not exposed to browser) */
  orthancBaseUrl: string;
  /** OHIF viewer base URL (browser-accessible via proxy) */
  viewerBaseUrl: string;
  /** DICOMweb root on this tenant's Orthanc */
  dicomWebRoot: string;
  /** Orthanc AE Title for this facility */
  orthancAeTitle: string;
  /** Object storage path prefix (for future S3/blob separation) */
  storagePrefix: string;
  /** Allowed AE Titles that can C-STORE to this facility's Orthanc */
  aeAllowlist: string[];
  /** Whether this facility config is active */
  active: boolean;
}

/* ================================================================== */
/* Config store                                                         */
/* ================================================================== */

const tenantConfigs = new Map<string, TenantImagingConfig>();

/**
 * Default tenant config — used for single-tenant development.
 * All values come from IMAGING_CONFIG (env-overridable).
 */
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default";
const DEFAULT_FACILITY_ID = process.env.DEFAULT_FACILITY_ID || "500";

function initDefaultTenant(): void {
  if (tenantConfigs.size > 0) return;
  tenantConfigs.set(configKey(DEFAULT_TENANT_ID, DEFAULT_FACILITY_ID), {
    tenantId: DEFAULT_TENANT_ID,
    facilityId: DEFAULT_FACILITY_ID,
    facilityName: process.env.DEFAULT_FACILITY_NAME || "WORLDVISTA",
    orthancBaseUrl: IMAGING_CONFIG.orthancUrl,
    viewerBaseUrl: IMAGING_CONFIG.ohifUrl,
    dicomWebRoot: IMAGING_CONFIG.dicomWebRoot,
    orthancAeTitle: process.env.ORTHANC_AE_TITLE || "VISTAEVOLVED",
    storagePrefix: `tenant/${DEFAULT_TENANT_ID}/facility/${DEFAULT_FACILITY_ID}/`,
    aeAllowlist: parseAllowlist(process.env.FACILITY_AE_ALLOWLIST || ""),
    active: true,
  });
}

function configKey(tenantId: string, facilityId: string): string {
  return `${tenantId}::${facilityId}`;
}

function parseAllowlist(csv: string): string[] {
  return csv.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

/* ================================================================== */
/* Public API                                                           */
/* ================================================================== */

/**
 * Resolve imaging config for a tenant+facility pair.
 * Falls back to default tenant if no specific config exists.
 */
export function resolveImagingConfig(tenantId: string, facilityId?: string): TenantImagingConfig | null {
  initDefaultTenant();

  // Try exact match
  if (facilityId) {
    const exact = tenantConfigs.get(configKey(tenantId, facilityId));
    if (exact?.active) return exact;
  }

  // Try tenant-level match (any facility)
  for (const cfg of tenantConfigs.values()) {
    if (cfg.tenantId === tenantId && cfg.active) return cfg;
  }

  // Fall back to default
  const defaultCfg = tenantConfigs.get(configKey(DEFAULT_TENANT_ID, DEFAULT_FACILITY_ID));
  return defaultCfg?.active ? defaultCfg : null;
}

/**
 * Get all tenant configs (admin view).
 */
export function getAllTenantConfigs(): TenantImagingConfig[] {
  initDefaultTenant();
  return Array.from(tenantConfigs.values());
}

/**
 * Register or update a tenant imaging config.
 */
export function upsertTenantConfig(config: TenantImagingConfig): void {
  tenantConfigs.set(configKey(config.tenantId, config.facilityId), config);
}

/**
 * Check if an AE Title is allowed for a given facility.
 * If the facility has no allowlist (empty), all AE Titles are allowed (open mode).
 * If the facility has an allowlist, only listed AE Titles are permitted.
 */
export function isAeTitleAllowed(tenantId: string, facilityId: string, aeTitle: string): boolean {
  const cfg = resolveImagingConfig(tenantId, facilityId);
  if (!cfg) return false;
  // Empty allowlist = open mode (any AE Title accepted)
  if (cfg.aeAllowlist.length === 0) return true;
  return cfg.aeAllowlist.includes(aeTitle.toUpperCase());
}

/**
 * Get the Orthanc URL for a given tenant+facility.
 * This is the internal URL used by the API proxy — never exposed to browsers.
 */
export function getOrthancUrl(tenantId: string, facilityId?: string): string {
  const cfg = resolveImagingConfig(tenantId, facilityId);
  return cfg?.orthancBaseUrl || IMAGING_CONFIG.orthancUrl;
}

/**
 * Get the viewer URL for a given tenant+facility.
 */
export function getViewerUrl(tenantId: string, facilityId?: string): string {
  const cfg = resolveImagingConfig(tenantId, facilityId);
  return cfg?.viewerBaseUrl || IMAGING_CONFIG.ohifUrl;
}
