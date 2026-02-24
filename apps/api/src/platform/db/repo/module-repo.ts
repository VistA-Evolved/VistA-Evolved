/**
 * Module Entitlement Repository -- Phase 109
 *
 * CRUD for module_catalog, tenant_module, tenant_feature_flag,
 * and module_audit_log tables. All operations are tenant-scoped
 * to prevent cross-tenant leakage.
 */

import { eq, and, desc, count } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  moduleCatalog,
  tenantModule,
  tenantFeatureFlag,
  moduleAuditLog,
} from "../schema.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ModuleCatalogRow {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  alwaysEnabled: boolean;
  dependencies: string[];
  routePatterns: string[];
  adapters: string[];
  permissions: string[];
  dataStores: { id: string; type: string; description: string }[];
  healthCheckEndpoint: string | null;
}

export interface TenantModuleRow {
  id: string;
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  planTier: string;
  enabledAt: string | null;
  disabledAt: string | null;
  enabledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFeatureFlagRow {
  id: string;
  tenantId: string;
  flagKey: string;
  flagValue: string;
  moduleId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleAuditEntry {
  id: string;
  tenantId: string;
  actorId: string;
  actorType: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Module Catalog                                                      */
/* ------------------------------------------------------------------ */

/** Upsert a module catalog entry (used during seed from modules.json). */
export function upsertModuleCatalog(entry: ModuleCatalogRow): void {
  const db = getDb();
  const now = new Date().toISOString();

  // Check if exists
  const existing = db
    .select()
    .from(moduleCatalog)
    .where(eq(moduleCatalog.moduleId, entry.moduleId))
    .get();

  if (existing) {
    db.update(moduleCatalog)
      .set({
        name: entry.name,
        description: entry.description,
        version: entry.version,
        alwaysEnabled: entry.alwaysEnabled,
        dependenciesJson: JSON.stringify(entry.dependencies),
        routePatternsJson: JSON.stringify(entry.routePatterns),
        adaptersJson: JSON.stringify(entry.adapters),
        permissionsJson: JSON.stringify(entry.permissions),
        dataStoresJson: JSON.stringify(entry.dataStores || []),
        healthCheckEndpoint: entry.healthCheckEndpoint,
        updatedAt: now,
      })
      .where(eq(moduleCatalog.moduleId, entry.moduleId))
      .run();
  } else {
    db.insert(moduleCatalog)
      .values({
        moduleId: entry.moduleId,
        name: entry.name,
        description: entry.description,
        version: entry.version,
        alwaysEnabled: entry.alwaysEnabled,
        dependenciesJson: JSON.stringify(entry.dependencies),
        routePatternsJson: JSON.stringify(entry.routePatterns),
        adaptersJson: JSON.stringify(entry.adapters),
        permissionsJson: JSON.stringify(entry.permissions),
        dataStoresJson: JSON.stringify(entry.dataStores || []),
        healthCheckEndpoint: entry.healthCheckEndpoint,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

/** Get all module catalog entries. */
export function listModuleCatalog(): ModuleCatalogRow[] {
  const db = getDb();
  const rows = db.select().from(moduleCatalog).all();
  return rows.map(parseModuleCatalogRow);
}

/** Get a single module catalog entry. */
export function getModuleCatalogEntry(moduleId: string): ModuleCatalogRow | null {
  const db = getDb();
  const row = db
    .select()
    .from(moduleCatalog)
    .where(eq(moduleCatalog.moduleId, moduleId))
    .get();
  return row ? parseModuleCatalogRow(row) : null;
}

function parseModuleCatalogRow(row: any): ModuleCatalogRow {
  return {
    moduleId: row.moduleId,
    name: row.name,
    description: row.description,
    version: row.version,
    alwaysEnabled: Boolean(row.alwaysEnabled),
    dependencies: safeJsonParse(row.dependenciesJson, []),
    routePatterns: safeJsonParse(row.routePatternsJson, []),
    adapters: safeJsonParse(row.adaptersJson, []),
    permissions: safeJsonParse(row.permissionsJson, []),
    dataStores: safeJsonParse(row.dataStoresJson, []),
    healthCheckEndpoint: row.healthCheckEndpoint,
  };
}

/* ------------------------------------------------------------------ */
/* Tenant Module Entitlements                                          */
/* ------------------------------------------------------------------ */

/** Get all module entitlements for a tenant. */
export function listTenantModules(tenantId: string): TenantModuleRow[] {
  const db = getDb();
  return db
    .select()
    .from(tenantModule)
    .where(eq(tenantModule.tenantId, tenantId))
    .all() as TenantModuleRow[];
}

/** Get a single tenant module entitlement. */
export function getTenantModule(
  tenantId: string,
  moduleId: string
): TenantModuleRow | null {
  const db = getDb();
  return (
    (db
      .select()
      .from(tenantModule)
      .where(
        and(
          eq(tenantModule.tenantId, tenantId),
          eq(tenantModule.moduleId, moduleId)
        )
      )
      .get() as TenantModuleRow | undefined) ?? null
  );
}

/** Check if a module is enabled for a tenant. Falls back to catalog alwaysEnabled. */
export function isModuleEnabledForTenant(
  tenantId: string,
  moduleId: string
): boolean {
  // Always-enabled modules bypass tenant check
  const catalogEntry = getModuleCatalogEntry(moduleId);
  if (catalogEntry?.alwaysEnabled) return true;

  const row = getTenantModule(tenantId, moduleId);
  if (!row) return false; // Not provisioned = not enabled (safe default)
  return row.enabled;
}

/** Get all enabled module IDs for a tenant. */
export function getEnabledModuleIds(tenantId: string): string[] {
  const catalog = listModuleCatalog();
  const tenantMods = listTenantModules(tenantId);
  const tenantModMap = new Map(tenantMods.map((tm) => [tm.moduleId, tm]));

  const enabled: string[] = [];
  for (const mod of catalog) {
    if (mod.alwaysEnabled) {
      enabled.push(mod.moduleId);
    } else if (tenantModMap.get(mod.moduleId)?.enabled) {
      enabled.push(mod.moduleId);
    }
  }
  return enabled;
}

/**
 * Enable or disable a module for a tenant. Creates the row if it doesn't exist.
 * Returns the updated row.
 */
export function setModuleEnabled(
  tenantId: string,
  moduleId: string,
  enabled: boolean,
  actorId: string,
  planTier: string = "base"
): TenantModuleRow {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = getTenantModule(tenantId, moduleId);

  if (existing) {
    db.update(tenantModule)
      .set({
        enabled,
        planTier,
        enabledAt: enabled ? now : existing.enabledAt,
        disabledAt: enabled ? null : now,
        enabledBy: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(tenantModule.tenantId, tenantId),
          eq(tenantModule.moduleId, moduleId)
        )
      )
      .run();
  } else {
    const id = randomUUID();
    db.insert(tenantModule)
      .values({
        id,
        tenantId,
        moduleId,
        enabled,
        planTier,
        enabledAt: enabled ? now : null,
        disabledAt: enabled ? null : now,
        enabledBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return getTenantModule(tenantId, moduleId)!;
}

/**
 * Seed baseline modules for a tenant. Enables all modules from a given
 * SKU profile. Idempotent — does not overwrite existing entitlements.
 */
export function seedTenantModules(
  tenantId: string,
  moduleIds: string[],
  actorId: string = "system"
): number {
  let seeded = 0;
  for (const moduleId of moduleIds) {
    const existing = getTenantModule(tenantId, moduleId);
    if (!existing) {
      setModuleEnabled(tenantId, moduleId, true, actorId);
      seeded++;
    }
  }
  return seeded;
}

/* ------------------------------------------------------------------ */
/* Feature Flags                                                       */
/* ------------------------------------------------------------------ */

/** Get all feature flags for a tenant. */
export function listTenantFeatureFlags(
  tenantId: string
): TenantFeatureFlagRow[] {
  const db = getDb();
  return db
    .select()
    .from(tenantFeatureFlag)
    .where(eq(tenantFeatureFlag.tenantId, tenantId))
    .all() as TenantFeatureFlagRow[];
}

/** Get a single feature flag. */
export function getTenantFeatureFlag(
  tenantId: string,
  flagKey: string
): TenantFeatureFlagRow | null {
  const db = getDb();
  return (
    (db
      .select()
      .from(tenantFeatureFlag)
      .where(
        and(
          eq(tenantFeatureFlag.tenantId, tenantId),
          eq(tenantFeatureFlag.flagKey, flagKey)
        )
      )
      .get() as TenantFeatureFlagRow | undefined) ?? null
  );
}

/** Resolve a feature flag value (returns string or null if not set). */
export function resolveFeatureFlag(
  tenantId: string,
  flagKey: string
): string | null {
  const row = getTenantFeatureFlag(tenantId, flagKey);
  return row ? row.flagValue : null;
}

/** Upsert a feature flag for a tenant. */
export function upsertTenantFeatureFlag(
  tenantId: string,
  flagKey: string,
  flagValue: string,
  moduleId?: string,
  description?: string
): TenantFeatureFlagRow {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = getTenantFeatureFlag(tenantId, flagKey);
  if (existing) {
    db.update(tenantFeatureFlag)
      .set({
        flagValue,
        moduleId: moduleId ?? existing.moduleId,
        description: description ?? existing.description,
        updatedAt: now,
      })
      .where(
        and(
          eq(tenantFeatureFlag.tenantId, tenantId),
          eq(tenantFeatureFlag.flagKey, flagKey)
        )
      )
      .run();
  } else {
    db.insert(tenantFeatureFlag)
      .values({
        id: randomUUID(),
        tenantId,
        flagKey,
        flagValue,
        moduleId: moduleId ?? null,
        description: description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  return getTenantFeatureFlag(tenantId, flagKey)!;
}

/** Delete a feature flag for a tenant. Returns true if deleted. */
export function deleteTenantFeatureFlag(
  tenantId: string,
  flagKey: string
): boolean {
  const db = getDb();
  const result = db
    .delete(tenantFeatureFlag)
    .where(
      and(
        eq(tenantFeatureFlag.tenantId, tenantId),
        eq(tenantFeatureFlag.flagKey, flagKey)
      )
    )
    .run();
  return result.changes > 0;
}

/* ------------------------------------------------------------------ */
/* Audit Log                                                           */
/* ------------------------------------------------------------------ */

/** Append an audit log entry. */
export function appendModuleAudit(
  entry: Omit<ModuleAuditEntry, "id" | "createdAt">
): ModuleAuditEntry {
  const db = getDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.insert(moduleAuditLog)
    .values({ id, createdAt, ...entry })
    .run();

  return { id, createdAt, ...entry };
}

/** List audit log entries for a tenant (newest first, with pagination). */
export function listModuleAuditLog(
  tenantId: string,
  limit: number = 100,
  offset: number = 0
): ModuleAuditEntry[] {
  const db = getDb();
  return db
    .select()
    .from(moduleAuditLog)
    .where(eq(moduleAuditLog.tenantId, tenantId))
    .orderBy(desc(moduleAuditLog.createdAt))
    .limit(limit)
    .offset(offset)
    .all() as ModuleAuditEntry[];
}

/** Count total audit entries for a tenant. */
export function countModuleAuditLog(tenantId: string): number {
  const db = getDb();
  const result = db
    .select({ cnt: count() })
    .from(moduleAuditLog)
    .where(eq(moduleAuditLog.tenantId, tenantId))
    .get();
  return (result as any)?.cnt ?? 0;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
