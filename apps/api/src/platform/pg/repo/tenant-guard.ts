/**
 * tenant-guard.ts -- Phase 122/174/176: Tenant Isolation Enforcement
 *
 * Application-layer tenant isolation guards. In PG-only mode, RLS enforces
 * tenant isolation at the database level, but these guards provide defense-
 * in-depth at the application layer.
 *
 * Phase 176: All table lists now derive from CANONICAL_RLS_TABLES in
 * pg-migrate.ts to prevent list drift.
 *
 * Usage:
 *   import { requireTenantId, assertTenantMatch } from "./tenant-guard.js";
 *
 *   function findFoo(tenantId: string, id: string) {
 *     requireTenantId(tenantId);
 *     const row = db.select()...;
 *     return row ? assertTenantMatch(row, tenantId) : null;
 *   }
 */

import { CANONICAL_RLS_TABLES } from "../pg-migrate.js";

/**
 * Validate that a tenantId is present and non-empty.
 * Throws if missing -- fail CLOSED.
 */
export function requireTenantId(tenantId: string | undefined | null, context?: string): asserts tenantId is string {
  if (!tenantId || tenantId.trim() === "") {
    const ctx = context ? ` (${context})` : "";
    throw new TenantIsolationError(`Missing required tenant_id${ctx}`);
  }
}

/**
 * Verify that a DB row belongs to the expected tenant.
 * Returns the row if it matches, throws if it doesn't.
 * Prevents cross-tenant data access via PK lookups.
 */
export function assertTenantMatch<T extends { tenantId?: string | null }>(
  row: T,
  expectedTenantId: string,
  context?: string,
): T {
  // Rows without tenantId are global (e.g., payer catalog) -- pass through
  if (row.tenantId === undefined || row.tenantId === null) return row;
  if (row.tenantId !== expectedTenantId) {
    const ctx = context ? ` (${context})` : "";
    throw new TenantIsolationError(
      `Tenant mismatch${ctx}: row belongs to '${row.tenantId}', request is for '${expectedTenantId}'`,
    );
  }
  return row;
}

/**
 * Dedicated error class for tenant isolation violations.
 * HTTP handlers should catch this and return 403.
 */
export class TenantIsolationError extends Error {
  public readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "TenantIsolationError";
  }
}

/**
 * Tables that are logically global reference data but still receive RLS
 * policies (because they have tenant_id for partitioning).
 * Guard code should allow null/missing tenantId on reads for these.
 */
export const GLOBAL_TABLES = [
  "payer",                  // Global reference data
  "module_catalog",         // Global module definitions
] as const;

/**
 * Phase 176: TENANT_SCOPED_TABLES is derived from the canonical RLS list,
 * minus the GLOBAL_TABLES. This ensures it stays in sync automatically.
 */
const _globalSet = new Set<string>(GLOBAL_TABLES);
export const TENANT_SCOPED_TABLES: readonly string[] =
  CANONICAL_RLS_TABLES.filter(t => !_globalSet.has(t));

/**
 * Phase 176: No more "pending" tables -- all tables now have tenant_id
 * columns and are covered by RLS. Retained as empty for backward compat.
 */
export const PENDING_TENANT_ID_TABLES: readonly string[] = [] as const;
