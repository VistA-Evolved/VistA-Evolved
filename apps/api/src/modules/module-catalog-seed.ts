/**
 * Module Catalog Seed -- Phase 109
 *
 * Reads config/modules.json + config/skus.json and seeds the platform DB
 * module_catalog table + default tenant entitlements. Called once during
 * startup after initPlatformDb().
 *
 * Idempotent: upsertModuleCatalog does INSERT or UPDATE, and
 * seedTenantModules only inserts rows that don't yet exist.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { log } from "../lib/logger.js";
import {
  upsertModuleCatalog,
  seedTenantModules,
  listModuleCatalog,
  getEnabledModuleIds,
  appendModuleAudit,
} from "../platform/db/repo/module-repo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_ROOT = join(__dirname, "..", "..", "..", "..", "config");

export interface SeedResult {
  catalogCount: number;
  defaultTenantSeeded: number;
  defaultTenantEnabled: number;
}

/**
 * Seed the module catalog from config/modules.json and create default
 * tenant entitlements from the active SKU profile.
 */
export function seedModuleCatalogFromConfig(): SeedResult {
  const modulesPath = join(CONFIG_ROOT, "modules.json");
  const modulesData = JSON.parse(readFileSync(modulesPath, "utf-8"));
  const modules: Record<string, any> = modulesData.modules || {};

  const skusPath = join(CONFIG_ROOT, "skus.json");
  const skusData = JSON.parse(readFileSync(skusPath, "utf-8"));
  const skus: Record<string, any> = skusData.skus || {};

  // 1. Seed module catalog
  let catalogCount = 0;
  for (const [moduleId, def] of Object.entries(modules)) {
    upsertModuleCatalog({
      moduleId,
      name: def.name || moduleId,
      description: def.description || "",
      version: def.version || "1.0.0",
      alwaysEnabled: Boolean(def.alwaysEnabled),
      dependencies: def.dependencies || [],
      routePatterns: def.routePatterns || [],
      adapters: def.adapters || [],
      permissions: def.permissions || [],
      dataStores: def.dataStores || [],
      healthCheckEndpoint: def.healthCheckEndpoint || null,
    });
    catalogCount++;
  }

  // 2. Seed default tenant entitlements from active SKU
  const activeSku = process.env.DEPLOY_SKU || "FULL_SUITE";
  const skuProfile = skus[activeSku];
  const skuModules: string[] = skuProfile?.modules || Object.keys(modules);

  const defaultTenantSeeded = seedTenantModules("default", skuModules, "system");

  // 3. Audit the seed event (only if we actually seeded new rows)
  if (defaultTenantSeeded > 0) {
    appendModuleAudit({
      tenantId: "default",
      actorId: "system",
      actorType: "system",
      entityType: "entitlement",
      entityId: "startup-seed",
      action: "create",
      beforeJson: null,
      afterJson: JSON.stringify({
        sku: activeSku,
        moduleIds: skuModules,
        seeded: defaultTenantSeeded,
      }),
      reason: "Automatic startup seed from modules.json + SKU profile",
    });
  }

  const defaultTenantEnabled = getEnabledModuleIds("default").length;

  log.info("Module catalog seed complete", {
    catalogCount,
    sku: activeSku,
    defaultTenantSeeded,
    defaultTenantEnabled,
  });

  return { catalogCount, defaultTenantSeeded, defaultTenantEnabled };
}
