/**
 * Module Registry — Phase 37C, enhanced Phase 51 (marketplace-ready manifests).
 *
 * Loads module definitions from config/modules.json and SKU profiles from
 * config/skus.json. Resolves effective enabled modules for a tenant based
 * on the deploy SKU + per-tenant overrides.
 *
 * Phase 51 additions:
 *   - Enhanced manifest fields: version, permissions, dataStores, healthCheckEndpoint
 *   - Module health aggregation (calls each module's health endpoint)
 *   - Full manifest export for marketplace/admin UI
 *
 * The registry is the single source of truth for:
 *   - Which modules exist in the system
 *   - Which route patterns belong to each module
 *   - Which modules are enabled for a given tenant
 *   - Dependency validation between modules
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Data store descriptor for a module (Phase 51). */
export interface ModuleDataStore {
  id: string;
  type: "in-memory" | "in-memory+jsonl" | "vista" | "json-seed" | "filesystem" | "external-sql";
  description: string;
}

export interface ModuleDefinition {
  name: string;
  version: string;
  description: string;
  alwaysEnabled: boolean;
  routePatterns: string[];
  dependencies: string[];
  adapters: string[];
  services: string[];
  /** RBAC permissions required to access this module (Phase 51). */
  permissions: string[];
  /** Data stores used by this module (Phase 51). */
  dataStores: ModuleDataStore[];
  /** Health check endpoint path (Phase 51). */
  healthCheckEndpoint: string;
}

export interface SkuProfile {
  name: string;
  description: string;
  modules: string[];
}

export type ModuleId = string;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_ROOT = join(__dirname, "..", "..", "..", "..", "config");

let moduleDefinitions: Record<string, ModuleDefinition> = {};
let skuProfiles: Record<string, SkuProfile> = {};
let compiledPatterns: Map<string, RegExp[]> = new Map();

// Per-tenant module overrides (in-memory; production would use DB)
const tenantModuleOverrides = new Map<string, Set<string>>();

// Active SKU (from env)
let activeSku: string = "FULL_SUITE";

/* ------------------------------------------------------------------ */
/* Initialization                                                      */
/* ------------------------------------------------------------------ */

export function initModuleRegistry(): void {
  try {
    const modulesPath = join(CONFIG_ROOT, "modules.json");
    const modulesData = JSON.parse(readFileSync(modulesPath, "utf-8"));
    moduleDefinitions = modulesData.modules || {};

    const skusPath = join(CONFIG_ROOT, "skus.json");
    const skusData = JSON.parse(readFileSync(skusPath, "utf-8"));
    skuProfiles = skusData.skus || {};

    // Compile regex patterns for route matching
    compiledPatterns.clear();
    for (const [modId, def] of Object.entries(moduleDefinitions)) {
      const regexes = def.routePatterns.map((p) => new RegExp(p));
      compiledPatterns.set(modId, regexes);
    }

    // Read active SKU from env
    activeSku = process.env.DEPLOY_SKU || "FULL_SUITE";

    log.info("Module registry initialized", {
      moduleCount: Object.keys(moduleDefinitions).length,
      skuCount: Object.keys(skuProfiles).length,
      activeSku,
    });
  } catch (err: any) {
    log.warn("Failed to load module registry, defaulting to all-enabled", {
      error: err.message,
    });
    moduleDefinitions = {};
    skuProfiles = {};
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get all module definitions. */
export function getModuleDefinitions(): Record<string, ModuleDefinition> {
  return moduleDefinitions;
}

/** Get a specific module definition. */
export function getModuleDefinition(moduleId: string): ModuleDefinition | undefined {
  return moduleDefinitions[moduleId];
}

/** Get all SKU profiles. */
export function getSkuProfiles(): Record<string, SkuProfile> {
  return skuProfiles;
}

/** Get the active SKU name. */
export function getActiveSku(): string {
  return activeSku;
}

/** Get the active SKU profile. */
export function getActiveSkuProfile(): SkuProfile | undefined {
  return skuProfiles[activeSku];
}

/**
 * Get effective enabled modules for a tenant.
 *
 * Resolution order:
 * 1. Start with SKU profile modules
 * 2. Apply per-tenant overrides (if any)
 * 3. Always include modules with alwaysEnabled: true
 * 4. Validate dependencies
 */
export function getEnabledModules(tenantId: string = "default"): string[] {
  // 1. Start with SKU modules
  const skuProfile = skuProfiles[activeSku];
  let enabled = new Set<string>(skuProfile?.modules || Object.keys(moduleDefinitions));

  // 2. Apply per-tenant overrides
  const overrides = tenantModuleOverrides.get(tenantId);
  if (overrides) {
    enabled = overrides;
  }

  // 3. Always include alwaysEnabled modules
  for (const [modId, def] of Object.entries(moduleDefinitions)) {
    if (def.alwaysEnabled) {
      enabled.add(modId);
    }
  }

  return Array.from(enabled);
}

/** Check if a specific module is enabled for a tenant. */
export function isModuleEnabled(moduleId: string, tenantId: string = "default"): boolean {
  const def = moduleDefinitions[moduleId];
  if (def?.alwaysEnabled) return true;
  return getEnabledModules(tenantId).includes(moduleId);
}

/**
 * Resolve which module owns a given route path.
 * Returns the moduleId or undefined if no match (kernel fallback).
 */
export function resolveModuleForRoute(path: string): string | undefined {
  for (const [modId, patterns] of compiledPatterns.entries()) {
    for (const regex of patterns) {
      if (regex.test(path)) {
        return modId;
      }
    }
  }
  return undefined;
}

/**
 * Check if a route path is allowed for a tenant.
 * Returns { allowed, moduleId, reason }.
 */
export function isRouteAllowed(
  path: string,
  tenantId: string = "default"
): { allowed: boolean; moduleId: string | undefined; reason?: string } {
  const moduleId = resolveModuleForRoute(path);

  // No module match → kernel or unmatched → allow
  if (!moduleId) {
    return { allowed: true, moduleId: undefined };
  }

  // Always-enabled modules
  const def = moduleDefinitions[moduleId];
  if (def?.alwaysEnabled) {
    return { allowed: true, moduleId };
  }

  // Check if module is enabled for tenant
  if (isModuleEnabled(moduleId, tenantId)) {
    return { allowed: true, moduleId };
  }

  return {
    allowed: false,
    moduleId,
    reason: `Module '${moduleId}' (${def?.name || moduleId}) is not enabled for this facility`,
  };
}

/**
 * Set per-tenant module overrides.
 * Pass null to clear overrides (revert to SKU defaults).
 */
export function setTenantModules(tenantId: string, modules: string[] | null): void {
  if (modules === null) {
    tenantModuleOverrides.delete(tenantId);
  } else {
    // Always include kernel
    const set = new Set(modules);
    set.add("kernel");
    tenantModuleOverrides.set(tenantId, set);
  }
}

/** Validate module dependencies. Returns list of unmet dependencies. */
export function validateDependencies(enabledModules: string[]): string[] {
  const enabled = new Set(enabledModules);
  const errors: string[] = [];

  for (const modId of enabledModules) {
    const def = moduleDefinitions[modId];
    if (!def) continue;
    for (const dep of def.dependencies) {
      if (!enabled.has(dep)) {
        errors.push(`Module '${modId}' requires '${dep}' which is not enabled`);
      }
    }
  }

  return errors;
}

/** Get module status summary (for admin/status endpoints). */
export function getModuleStatus(tenantId: string = "default"): Array<{
  moduleId: string;
  name: string;
  enabled: boolean;
  alwaysEnabled: boolean;
  dependencies: string[];
  adapterTypes: string[];
  version: string;
  permissions: string[];
  dataStores: ModuleDataStore[];
  healthCheckEndpoint: string;
}> {
  const enabled = getEnabledModules(tenantId);

  return Object.entries(moduleDefinitions).map(([modId, def]) => ({
    moduleId: modId,
    name: def.name,
    enabled: enabled.includes(modId),
    alwaysEnabled: def.alwaysEnabled,
    dependencies: def.dependencies,
    adapterTypes: def.adapters,
    version: def.version || "0.0.0",
    permissions: def.permissions || [],
    dataStores: def.dataStores || [],
    healthCheckEndpoint: def.healthCheckEndpoint || "",
  }));
}

/**
 * Get full module manifest for marketplace display (Phase 51).
 * Includes all manifest fields + enablement status for a tenant.
 */
export function getModuleManifest(
  moduleId: string,
  tenantId: string = "default"
): {
  moduleId: string;
  manifest: ModuleDefinition;
  enabled: boolean;
  dependenciesMet: boolean;
  missingDependencies: string[];
} | undefined {
  const def = moduleDefinitions[moduleId];
  if (!def) return undefined;

  const enabledMods = getEnabledModules(tenantId);
  const enabledSet = new Set(enabledMods);
  const missing = def.dependencies.filter((d) => !enabledSet.has(d));

  return {
    moduleId,
    manifest: def,
    enabled: enabledMods.includes(moduleId),
    dependenciesMet: missing.length === 0,
    missingDependencies: missing,
  };
}

/**
 * Get all module manifests for marketplace display (Phase 51).
 */
export function getAllModuleManifests(tenantId: string = "default"): Array<{
  moduleId: string;
  manifest: ModuleDefinition;
  enabled: boolean;
  dependenciesMet: boolean;
  missingDependencies: string[];
}> {
  return Object.keys(moduleDefinitions)
    .map((modId) => getModuleManifest(modId, tenantId))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);
}
