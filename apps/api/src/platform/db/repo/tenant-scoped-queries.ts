/**
 * Tenant-Scoped Query Helpers -- Phase 122
 *
 * Utility functions that wrap common DB query patterns with
 * automatic tenant_id injection. These prevent accidental
 * cross-tenant data access by making tenant isolation the default.
 *
 * Usage:
 *   import { tenantWhere, tenantInsert } from './tenant-scoped-queries.js';
 *
 *   // SELECT with automatic tenant filter
 *   const rows = await pool.query(
 *     `SELECT * FROM rcm_claim WHERE ${tenantWhere(tenantId)} AND status = $2`,
 *     [tenantId, 'pending']
 *   );
 *
 *   // INSERT with automatic tenant_id column
 *   const cols = tenantInsert(tenantId, { claim_id: '123', status: 'new' });
 */

import { requireTenantId } from './tenant-guard.js';

/**
 * Generate a WHERE clause fragment that filters by tenant_id.
 * Always uses parameterized queries to prevent SQL injection.
 *
 * @param tenantId - The tenant ID (validated via requireTenantId)
 * @param paramIndex - The $N parameter index (default $1)
 * @returns SQL fragment like "tenant_id = $1"
 */
export function tenantWhere(tenantId: string, paramIndex = 1): string {
  requireTenantId(tenantId, 'tenantWhere');
  return `tenant_id = $${paramIndex}`;
}

/**
 * Merge tenant_id into an INSERT data object.
 * Ensures tenant_id is always included in write operations.
 *
 * @param tenantId - The tenant ID (validated via requireTenantId)
 * @param data - The row data to insert
 * @returns New object with tenant_id prepended
 */
export function tenantInsert<T extends Record<string, unknown>>(
  tenantId: string,
  data: T
): T & { tenant_id: string } {
  requireTenantId(tenantId, 'tenantInsert');
  return { tenant_id: tenantId, ...data };
}

/**
 * Build a SET LOCAL statement for PG RLS session variable.
 * Must be executed inside a transaction before any tenant-scoped queries.
 *
 * @param tenantId - The tenant ID to set for the current transaction
 * @returns SQL statement string
 */
export function tenantSetLocal(tenantId: string): string {
  requireTenantId(tenantId, 'tenantSetLocal');
  // Use parameterized approach in actual queries; this returns the template
  return `SET LOCAL app.current_tenant_id = '${tenantId}'`;
}

/**
 * Validate that a query result set only contains records for the expected tenant.
 * Useful for post-query verification in development/testing.
 *
 * @param rows - Array of records with tenant_id field
 * @param expectedTenantId - The expected tenant ID
 * @returns true if all records match, throws on violation
 */
export function validateTenantResults(
  rows: Array<{ tenant_id?: string; tenantId?: string }>,
  expectedTenantId: string
): boolean {
  requireTenantId(expectedTenantId, 'validateTenantResults');
  for (const row of rows) {
    const rowTenant = row.tenant_id || row.tenantId;
    if (rowTenant && rowTenant !== expectedTenantId) {
      throw new Error(
        `Tenant isolation post-check failed: expected ${expectedTenantId}, ` +
          `found ${rowTenant} in result set`
      );
    }
  }
  return true;
}
