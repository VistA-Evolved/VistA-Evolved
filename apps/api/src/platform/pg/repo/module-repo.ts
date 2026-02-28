/**
 * Module Entitlement Repository (PostgreSQL) — Phase 109
 *
 * CRUD for module_catalog, tenant_module, tenant_feature_flag,
 * and module_audit_log tables. All operations are tenant-scoped
 * to prevent cross-tenant leakage.
 *
 * Mirrors apps/api/src/platform/db/repo/module-repo.ts but uses
 * Postgres via getPgDb() instead of SQLite via getDb().
 */

import { eq, and, desc, count, sql } from "drizzle-orm";
import { getPgDb } from "../pg-db.js";
import {
  moduleCatalog,
  tenantModule,
  tenantFeatureFlag,
  moduleAuditLog,
} from "../pg-schema.js";
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
  rolloutPercentage: number | null;
  userTargeting: unknown[] | null;
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
export async function upsertModuleCatalog(entry: ModuleCatalogRow): Promise<void> {
  const db = getPgDb();
  const now = new Date().toISOString();

  const rows = await db
    .select()
    .from(moduleCatalog)
    .where(eq(moduleCatalog.moduleId, entry.moduleId));
  const existing = rows[0];

  if (existing) {
    await db
      .update(moduleCatalog)
      .set({
        name: entry.name,
        description: entry.description,
        version: entry.version,
        alwaysEnabled: entry.alwaysEnabled ? 1 : 0,
        dependenciesJson: JSON.stringify(entry.dependencies),
        routePatternsJson: JSON.stringify(entry.routePatterns),
        adaptersJson: JSON.stringify(entry.adapters),
        permissionsJson: JSON.stringify(entry.permissions),
        dataStoresJson: JSON.stringify(entry.dataStores || []),
        healthCheckEndpoint: entry.healthCheckEndpoint,
        updatedAt: now,
      })
      .where(eq(moduleCatalog.moduleId, entry.moduleId));
  } else {
    await db.insert(moduleCatalog).values({
      moduleId: entry.moduleId,
      name: entry.name,
      description: entry.description,
      version: entry.version,
      alwaysEnabled: entry.alwaysEnabled ? 1 : 0,
      dependenciesJson: JSON.stringify(entry.dependencies),
      routePatternsJson: JSON.stringify(entry.routePatterns),
      adaptersJson: JSON.stringify(entry.adapters),
      permissionsJson: JSON.stringify(entry.permissions),
      dataStoresJson: JSON.stringify(entry.dataStores || []),
      healthCheckEndpoint: entry.healthCheckEndpoint,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** Get all module catalog entries. */
export async function listModuleCatalog(): Promise<ModuleCatalogRow[]> {
  const db = getPgDb();
  const rows = await db.select().from(moduleCatalog);
  return rows.map(parseModuleCatalogRow);
}

/** Get a single module catalog entry. */
export async function getModuleCatalogEntry(
  moduleId: string,
): Promise<ModuleCatalogRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(moduleCatalog)
    .where(eq(moduleCatalog.moduleId, moduleId));
  return rows[0] ? parseModuleCatalogRow(rows[0]) : null;
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
export async function listTenantModules(
  tenantId: string,
): Promise<TenantModuleRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(tenantModule)
    .where(eq(tenantModule.tenantId, tenantId));
  return rows.map(parseTenantModuleRow);
}

/** Get a single tenant module entitlement. */
export async function getTenantModule(
  tenantId: string,
  moduleId: string,
): Promise<TenantModuleRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(tenantModule)
    .where(
      and(
        eq(tenantModule.tenantId, tenantId),
        eq(tenantModule.moduleId, moduleId),
      ),
    );
  return rows[0] ? parseTenantModuleRow(rows[0]) : null;
}

/** Check if a module is enabled for a tenant. Falls back to catalog alwaysEnabled. */
export async function isModuleEnabledForTenant(
  tenantId: string,
  moduleId: string,
): Promise<boolean> {
  // Always-enabled modules bypass tenant check
  const catalogEntry = await getModuleCatalogEntry(moduleId);
  if (catalogEntry?.alwaysEnabled) return true;

  const row = await getTenantModule(tenantId, moduleId);
  if (!row) return false; // Not provisioned = not enabled (safe default)
  return row.enabled;
}

/** Get all enabled module IDs for a tenant. */
export async function getEnabledModuleIds(
  tenantId: string,
): Promise<string[]> {
  const catalog = await listModuleCatalog();
  const tenantMods = await listTenantModules(tenantId);
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
export async function setModuleEnabled(
  tenantId: string,
  moduleId: string,
  enabled: boolean,
  actorId: string,
  planTier: string = "base",
): Promise<TenantModuleRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  const existing = await getTenantModule(tenantId, moduleId);

  if (existing) {
    await db
      .update(tenantModule)
      .set({
        enabled: enabled ? 1 : 0,
        planTier,
        enabledAt: enabled ? now : existing.enabledAt,
        disabledAt: enabled ? null : now,
        enabledBy: actorId,
        updatedAt: now,
      })
      .where(
        and(
          eq(tenantModule.tenantId, tenantId),
          eq(tenantModule.moduleId, moduleId),
        ),
      );
  } else {
    const id = randomUUID();
    await db.insert(tenantModule).values({
      id,
      tenantId,
      moduleId,
      enabled: enabled ? 1 : 0,
      planTier,
      enabledAt: enabled ? now : null,
      disabledAt: enabled ? null : now,
      enabledBy: actorId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return (await getTenantModule(tenantId, moduleId))!;
}

/**
 * Seed baseline modules for a tenant. Enables all modules from a given
 * SKU profile. Idempotent -- does not overwrite existing entitlements.
 */
export async function seedTenantModules(
  tenantId: string,
  moduleIds: string[],
  actorId: string = "system",
): Promise<number> {
  let seeded = 0;
  for (const moduleId of moduleIds) {
    const existing = await getTenantModule(tenantId, moduleId);
    if (!existing) {
      await setModuleEnabled(tenantId, moduleId, true, actorId);
      seeded++;
    }
  }
  return seeded;
}

function parseTenantModuleRow(row: any): TenantModuleRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    moduleId: row.moduleId,
    enabled: Boolean(row.enabled),
    planTier: row.planTier,
    enabledAt: row.enabledAt,
    disabledAt: row.disabledAt,
    enabledBy: row.enabledBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Feature Flags                                                       */
/* ------------------------------------------------------------------ */

/** Get all feature flags for a tenant. */
export async function listTenantFeatureFlags(
  tenantId: string,
): Promise<TenantFeatureFlagRow[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(tenantFeatureFlag)
    .where(eq(tenantFeatureFlag.tenantId, tenantId));
  return rows as TenantFeatureFlagRow[];
}

/** Get a single feature flag. */
export async function getTenantFeatureFlag(
  tenantId: string,
  flagKey: string,
): Promise<TenantFeatureFlagRow | null> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(tenantFeatureFlag)
    .where(
      and(
        eq(tenantFeatureFlag.tenantId, tenantId),
        eq(tenantFeatureFlag.flagKey, flagKey),
      ),
    );
  return (rows[0] as TenantFeatureFlagRow | undefined) ?? null;
}

/** Resolve a feature flag value (returns string or null if not set). */
export async function resolveFeatureFlag(
  tenantId: string,
  flagKey: string,
): Promise<string | null> {
  const row = await getTenantFeatureFlag(tenantId, flagKey);
  return row ? row.flagValue : null;
}

/** Upsert a feature flag for a tenant. */
export async function upsertTenantFeatureFlag(
  tenantId: string,
  flagKey: string,
  flagValue: string,
  moduleId?: string,
  description?: string,
  rolloutPercentage?: number,
  userTargeting?: unknown[],
): Promise<TenantFeatureFlagRow> {
  const db = getPgDb();
  const now = new Date().toISOString();

  const existing = await getTenantFeatureFlag(tenantId, flagKey);
  if (existing) {
    await db
      .update(tenantFeatureFlag)
      .set({
        flagValue,
        moduleId: moduleId ?? existing.moduleId,
        description: description ?? existing.description,
        rolloutPercentage: rolloutPercentage ?? existing.rolloutPercentage,
        userTargeting: userTargeting ?? existing.userTargeting,
        updatedAt: now,
      })
      .where(
        and(
          eq(tenantFeatureFlag.tenantId, tenantId),
          eq(tenantFeatureFlag.flagKey, flagKey),
        ),
      );
  } else {
    await db.insert(tenantFeatureFlag).values({
      id: randomUUID(),
      tenantId,
      flagKey,
      flagValue,
      moduleId: moduleId ?? null,
      description: description ?? null,
      rolloutPercentage: rolloutPercentage ?? 100,
      userTargeting: userTargeting ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }

  return (await getTenantFeatureFlag(tenantId, flagKey))!;
}

/** Delete a feature flag for a tenant. Returns true if deleted. */
export async function deleteTenantFeatureFlag(
  tenantId: string,
  flagKey: string,
): Promise<boolean> {
  const db = getPgDb();
  const result = await db
    .delete(tenantFeatureFlag)
    .where(
      and(
        eq(tenantFeatureFlag.tenantId, tenantId),
        eq(tenantFeatureFlag.flagKey, flagKey),
      ),
    );
  // node-postgres returns rowCount on the result
  return ((result as any)?.rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Audit Log                                                           */
/* ------------------------------------------------------------------ */

/** Append an audit log entry. */
export async function appendModuleAudit(
  entry: Omit<ModuleAuditEntry, "id" | "createdAt">,
): Promise<ModuleAuditEntry> {
  const db = getPgDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  await db.insert(moduleAuditLog).values({ id, createdAt, ...entry });

  return { id, createdAt, ...entry };
}

/** List audit log entries for a tenant (newest first, with pagination). */
export async function listModuleAuditLog(
  tenantId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<ModuleAuditEntry[]> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(moduleAuditLog)
    .where(eq(moduleAuditLog.tenantId, tenantId))
    .orderBy(desc(moduleAuditLog.createdAt))
    .limit(limit)
    .offset(offset);
  return rows as ModuleAuditEntry[];
}

/** Count total audit entries for a tenant. */
export async function countModuleAuditLog(
  tenantId: string,
): Promise<number> {
  const db = getPgDb();
  const rows = await db
    .select({ cnt: count() })
    .from(moduleAuditLog)
    .where(eq(moduleAuditLog.tenantId, tenantId));
  return (rows[0] as any)?.cnt ?? 0;
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
