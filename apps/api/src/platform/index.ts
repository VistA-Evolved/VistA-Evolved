/**
 * Platform Module — Barrel Export
 *
 * Phase 101: Platform Data Architecture Convergence (Postgres)
 */

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
