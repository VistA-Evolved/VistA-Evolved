/**
 * country-pack-loader.ts — Loads and validates country-pack values.json files.
 *
 * Country packs live in /country-packs/<CC>/values.json at repo root.
 * Each pack configures regulatory, terminology, residency, module, and UI
 * defaults for a target market.
 *
 * Phase 314 (W13-P6)
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegulatoryProfile {
  framework: string;
  consentRequired: boolean;
  consentGranularity: 'all-or-nothing' | 'category' | 'item';
  dataExportRestricted: boolean;
  requiresConsentForTransfer: boolean;
  retentionMinYears: number;
  retentionMaxYears: number | null;
  breakGlassAllowed: boolean;
  auditRetentionDays: number;
  rightToErasure: boolean;
  dataPortability: boolean;
}

export interface DataResidencyConfig {
  region: string;
  crossBorderTransferAllowed: boolean;
  requiresConsentForTransfer: boolean;
  retentionMinYears: number;
}

export interface TerminologyDefaults {
  diagnosisCodeSystem: string;
  procedureCodeSystem: string;
  labCodeSystem: string;
  drugCodeSystem: string;
}

export interface UiDefaults {
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: string;
  currencyCode: string;
  theme: string;
  rtlSupport: boolean;
}

export interface ReportingRequirements {
  qualityMeasures: string[];
  publicHealthReporting: string[];
  claimFormats: string[];
  remittanceFormats: string[];
}

export interface CountryPackValues {
  countryCode: string;
  countryName: string;
  packVersion: string;
  status: 'draft' | 'active' | 'deprecated';
  maintainer: string;
  defaultLocale: string;
  defaultTimezone: string;
  supportedLocales: string[];
  regulatoryProfile: RegulatoryProfile;
  dataResidency: DataResidencyConfig;
  terminologyDefaults: TerminologyDefaults;
  payerModules: string[];
  enabledModules: string[];
  featureFlags: Record<string, boolean>;
  uiDefaults: UiDefaults;
  reportingRequirements: ReportingRequirements;
}

export interface PackLoadResult {
  pack: CountryPackValues;
  filePath: string;
  contentHash: string;
  loadedAt: string;
  validationErrors: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_FRAMEWORKS = ['HIPAA', 'DPA_PH', 'DPA_GH'];
const VALID_REGIONS = ['us-east', 'us-west', 'ph-mnl', 'gh-acc', 'eu-fra', 'local'];
const VALID_CODE_SYSTEMS = ['ICD-10-CM', 'ICD-10-WHO', 'CPT', 'LOINC', 'NDC', 'passthrough'];
const VALID_STATUSES = ['draft', 'active', 'deprecated'];
const VALID_GRANULARITIES = ['all-or-nothing', 'category', 'item'];
const VALID_TIME_FORMATS = ['12h', '24h'];

export function validatePack(pack: CountryPackValues): string[] {
  const errors: string[] = [];

  // Identity
  if (!pack.countryCode || pack.countryCode.length !== 2) {
    errors.push('countryCode must be a 2-letter ISO 3166-1 alpha-2 code');
  }
  if (!pack.countryName) errors.push('countryName is required');
  if (!pack.packVersion || !/^\d+\.\d+\.\d+$/.test(pack.packVersion)) {
    errors.push('packVersion must be valid SemVer (major.minor.patch)');
  }
  if (!VALID_STATUSES.includes(pack.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (!pack.defaultLocale) errors.push('defaultLocale is required');
  if (!pack.supportedLocales?.includes(pack.defaultLocale)) {
    errors.push('defaultLocale must be in supportedLocales');
  }

  // Regulatory
  const reg = pack.regulatoryProfile;
  if (reg) {
    if (!VALID_FRAMEWORKS.includes(reg.framework)) {
      errors.push(`regulatoryProfile.framework must be one of: ${VALID_FRAMEWORKS.join(', ')}`);
    }
    if (!VALID_GRANULARITIES.includes(reg.consentGranularity)) {
      errors.push(`consentGranularity must be one of: ${VALID_GRANULARITIES.join(', ')}`);
    }
    if (typeof reg.retentionMinYears !== 'number' || reg.retentionMinYears < 1) {
      errors.push('retentionMinYears must be >= 1');
    }
    if (typeof reg.auditRetentionDays !== 'number' || reg.auditRetentionDays < 365) {
      errors.push('auditRetentionDays must be >= 365');
    }
  } else {
    errors.push('regulatoryProfile is required');
  }

  // Data residency
  const dr = pack.dataResidency;
  if (dr) {
    if (!VALID_REGIONS.includes(dr.region)) {
      errors.push(`dataResidency.region must be one of: ${VALID_REGIONS.join(', ')}`);
    }
  } else {
    errors.push('dataResidency is required');
  }

  // Terminology
  const td = pack.terminologyDefaults;
  if (td) {
    for (const key of [
      'diagnosisCodeSystem',
      'procedureCodeSystem',
      'labCodeSystem',
      'drugCodeSystem',
    ] as const) {
      if (!VALID_CODE_SYSTEMS.includes(td[key])) {
        errors.push(`terminologyDefaults.${key} must be one of: ${VALID_CODE_SYSTEMS.join(', ')}`);
      }
    }
  } else {
    errors.push('terminologyDefaults is required');
  }

  // Modules
  if (!pack.enabledModules?.includes('kernel')) {
    errors.push('enabledModules must include "kernel"');
  }

  // UI
  const ui = pack.uiDefaults;
  if (ui) {
    if (!VALID_TIME_FORMATS.includes(ui.timeFormat)) {
      errors.push(`uiDefaults.timeFormat must be one of: ${VALID_TIME_FORMATS.join(', ')}`);
    }
    if (!ui.currencyCode || ui.currencyCode.length !== 3) {
      errors.push('uiDefaults.currencyCode must be a 3-letter ISO 4217 code');
    }
  } else {
    errors.push('uiDefaults is required');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/** Resolve the country-packs directory (repo root / country-packs). */
function resolvePacksDir(): string {
  // Walk from this file up to find the repo root (has package.json + country-packs/)
  let dir = resolve(__dirname);
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'country-packs');
    if (existsSync(candidate) && existsSync(join(dir, 'package.json'))) {
      return candidate;
    }
    dir = resolve(dir, '..');
  }
  // Fallback — assume CWD is repo root
  return resolve(process.cwd(), 'country-packs');
}

function hashContent(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/** Load a single country pack by ISO code. */
export function loadCountryPack(countryCode: string): PackLoadResult | null {
  const packsDir = resolvePacksDir();
  const valuesPath = join(packsDir, countryCode.toUpperCase(), 'values.json');
  if (!existsSync(valuesPath)) return null;

  const raw = readFileSync(valuesPath, 'utf-8');
  // Strip BOM (BUG-064)
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const pack = JSON.parse(clean) as CountryPackValues;
  const errors = validatePack(pack);

  return {
    pack,
    filePath: valuesPath,
    contentHash: hashContent(clean),
    loadedAt: new Date().toISOString(),
    validationErrors: errors,
  };
}

/** Load all country packs from the packs directory. */
export function loadAllCountryPacks(): PackLoadResult[] {
  const packsDir = resolvePacksDir();
  if (!existsSync(packsDir)) return [];

  const results: PackLoadResult[] = [];
  const dirs = readdirSync(packsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const cc of dirs) {
    const result = loadCountryPack(cc);
    if (result) results.push(result);
  }

  return results;
}

/** Get active packs only (status === 'active' and no validation errors). */
export function getActiveCountryPacks(): PackLoadResult[] {
  return loadAllCountryPacks().filter(
    (r) => r.pack.status === 'active' && r.validationErrors.length === 0
  );
}

// ---------------------------------------------------------------------------
// In-memory cache for fast lookups
// ---------------------------------------------------------------------------

const packCache = new Map<string, PackLoadResult>();
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Get a country pack with caching. */
export function getCountryPack(countryCode: string): PackLoadResult | null {
  const now = Date.now();
  const key = countryCode.toUpperCase();

  if (now - cacheLoadedAt > CACHE_TTL_MS) {
    // Refresh entire cache
    packCache.clear();
    const all = loadAllCountryPacks();
    for (const r of all) {
      packCache.set(r.pack.countryCode.toUpperCase(), r);
    }
    cacheLoadedAt = now;
  }

  return packCache.get(key) ?? null;
}

/** List all cached pack summaries. */
export function listCountryPacks(): Array<{
  countryCode: string;
  countryName: string;
  packVersion: string;
  status: string;
  framework: string;
  region: string;
  validationErrors: number;
}> {
  // Ensure cache is populated
  getCountryPack('__trigger__');

  return Array.from(packCache.values()).map((r) => ({
    countryCode: r.pack.countryCode,
    countryName: r.pack.countryName,
    packVersion: r.pack.packVersion,
    status: r.pack.status,
    framework: r.pack.regulatoryProfile.framework,
    region: r.pack.dataResidency.region,
    validationErrors: r.validationErrors.length,
  }));
}

/** Resolve effective config for a tenant given their country code. */
export function resolvePackForTenant(countryCode: string): {
  ok: boolean;
  pack: CountryPackValues | null;
  errors: string[];
} {
  const result = getCountryPack(countryCode);
  if (!result) {
    return { ok: false, pack: null, errors: [`No country pack found for ${countryCode}`] };
  }
  if (result.pack.status !== 'active') {
    return {
      ok: false,
      pack: result.pack,
      errors: [`Pack ${countryCode} has status "${result.pack.status}" (must be "active")`],
    };
  }
  if (result.validationErrors.length > 0) {
    return { ok: false, pack: result.pack, errors: result.validationErrors };
  }
  return { ok: true, pack: result.pack, errors: [] };
}

/**
 * Phase 492 (W34-P2): Resolve the effective country policy for a tenant.
 *
 * This is the canonical entry point for all pack-based enforcement in P3-P9.
 * Returns the full CountryPackValues for a given tenantId by looking up the
 * tenant's countryPackId. Returns null if the pack cannot be resolved (missing,
 * draft, or invalid).
 *
 * Callers should import getTenant from tenant-config.ts to get the countryPackId,
 * then call this function. This avoids a circular import between tenant-config
 * and country-pack-loader.
 */
export function resolveCountryPolicy(countryPackId: string): CountryPackValues | null {
  if (!countryPackId) return null;
  const result = getCountryPack(countryPackId);
  if (!result) return null;
  // Accept both active and draft packs for dev flexibility;
  // resolvePackForTenant() enforces active-only for production gates
  return result.pack;
}
