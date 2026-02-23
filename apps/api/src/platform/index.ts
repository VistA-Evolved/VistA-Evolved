/**
 * Platform Module — Barrel Export
 *
 * Phase 95B: Platform Persistence Unification (SQLite)
 * Phase 101: Platform Data Architecture Convergence (Postgres)
 */

// SQLite (Phase 95B — remains as fallback)
export { getDb, closeDb, getRawDb } from "./db/db.js";
export { runMigrations } from "./db/migrate.js";
export { seedFromJsonFixtures } from "./db/seed.js";
export { initPlatformDb } from "./db/init.js";
export type { PlatformDbInitResult } from "./db/init.js";
export * from "./db/repo/index.js";

// Postgres (Phase 101 — primary platform store)
export {
  getPgDb,
  getPgPool,
  closePgDb,
  isPgConfigured,
  pgHealthCheck,
  runPgMigrations,
  applyRlsPolicies,
  initPlatformPg,
  resetPgInit,
  createTenantContext,
  defaultTenantContext,
  registerTenantHook,
  pgSchema,
} from "./pg/index.js";
export type { PgDb, PlatformPgInitResult, TenantContext } from "./pg/index.js";
