/**
 * Platform DB Repo Barrel — Phase 122
 *
 * Re-exports tenant isolation guards and scoped query helpers.
 */

export {
  TenantIsolationError,
  requireTenantId,
  assertTenantMatch,
  isTenantScoped,
  isGlobalTable,
  TENANT_SCOPED_TABLES,
  GLOBAL_TABLES,
} from './tenant-guard.js';

export type { TenantScopedTable, GlobalTable } from './tenant-guard.js';

export {
  tenantWhere,
  tenantInsert,
  tenantSetLocal,
  validateTenantResults,
} from './tenant-scoped-queries.js';
