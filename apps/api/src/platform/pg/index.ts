/**
 * Platform PG Module — Barrel Export
 *
 * Phase 101+102+103+104: Platform Data Architecture + Registry Migration + DB Performance + Security
 */

export { getPgDb, getPgPool, closePgDb, isPgConfigured, pgHealthCheck } from './pg-db.js';
export type { PgDb } from './pg-db.js';
export { runPgMigrations, applyRlsPolicies } from './pg-migrate.js';
export { initPlatformPg, resetPgInit } from './pg-init.js';
export type { PlatformPgInitResult } from './pg-init.js';
export { createTenantContext, defaultTenantContext } from './tenant-context.js';
export type { TenantContext } from './tenant-context.js';
export { registerTenantHook } from './tenant-middleware.js';
export * as pgSchema from './pg-schema.js';

// Phase 103: Retry + backoff
export { withPgRetry, isPgUniqueViolation } from './pg-retry.js';
export type { PgRetryOptions, PgRetryResult } from './pg-retry.js';

// Phase 276: Read-through cache utilities
export { readThroughGet, readThroughList, hydrateMapsFromPg } from './read-through.js';
export type { HydrateTask } from './read-through.js';

// Phase 104: Audit integrity + export
export {
  verifyAuditChain,
  exportAuditEntries,
  getRetentionPolicy,
  sanitizeAuditDetail,
  computeAuditHash,
} from './audit-integrity.js';
export type { AuditVerifyResult, AuditExportResult, RetentionPolicy } from './audit-integrity.js';

// Phase 102: PG repos
export {
  pgPayerRepo,
  pgTenantPayerRepo,
  pgCapabilityRepo,
  pgTaskRepo,
  pgEvidenceRepo,
  pgAuditRepo,
  pgCapabilityMatrixRepo,
  pgSessionRepo,
  pgWorkqueueRepo,
} from './repo/index.js';
