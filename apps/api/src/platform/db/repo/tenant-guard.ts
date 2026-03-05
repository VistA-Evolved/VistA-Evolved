/**
 * Tenant Isolation Guard — Phase 122
 *
 * Provides tenant boundary enforcement for all DB operations.
 * Every query that touches tenant-scoped data MUST pass through
 * requireTenantId() to inject the tenant_id predicate.
 *
 * TENANT_SCOPED_TABLES is the canonical list of all tables that
 * carry a tenant_id column and require RLS enforcement.
 * GLOBAL_TABLES lists tables that are shared across tenants
 * (e.g., module_catalog, system configuration).
 *
 * assertTenantMatch() validates that a fetched record belongs
 * to the requesting tenant — defense-in-depth beyond RLS.
 */

// ── Tenant Isolation Error ──────────────────────────────────

export class TenantIsolationError extends Error {
  public readonly statusCode = 403;
  public readonly tenantId: string;
  public readonly table?: string;

  constructor(message: string, tenantId: string, table?: string) {
    super(message);
    this.name = 'TenantIsolationError';
    this.tenantId = tenantId;
    this.table = table;
  }
}

// ── Canonical Table Lists ───────────────────────────────────

/**
 * All tables that have a tenant_id column and MUST be
 * filtered/guarded in every query. Kept in sync with
 * CANONICAL_RLS_TABLES in pg-migrate.ts.
 */
export const TENANT_SCOPED_TABLES = [
  'auth_session',
  'portal_sessions',
  'portal_users',
  'portal_patient_identity',
  'tenant_payer',
  'tenant_module',
  'tenant_feature_flag',
  'tenant_oidc_mapping',
  'rcm_claim',
  'rcm_remittance',
  'rcm_claim_case',
  'rcm_work_item',
  'edi_acknowledgement',
  'edi_claim_status',
  'edi_pipeline_entry',
  'idempotency_key',
  'cpoe_order_sign_event',
  'module_audit_log',
  'audit_ship_offset',
  'consent_records',
  'intake_sessions',
  'scheduling_lifecycle',
  'scheduling_preferences',
  'scheduling_writeback',
  'identity_link_requests',
  'identity_links',
] as const;

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLES)[number];

/**
 * Tables that are NOT tenant-scoped — shared across all tenants.
 * These do NOT get RLS policies and do NOT require tenant_id filters.
 */
export const GLOBAL_TABLES = [
  'module_catalog',
  'system_config',
  'rpc_capability_cache',
  'migration_version',
] as const;

export type GlobalTable = (typeof GLOBAL_TABLES)[number];

// ── Guard Functions ─────────────────────────────────────────

/**
 * Extract and validate tenant_id from the request context.
 * Throws TenantIsolationError if tenant_id is missing or empty.
 *
 * @param tenantId - The tenant ID from session/request context
 * @param operation - Description of the operation for error messages
 * @returns The validated tenant ID string
 */
export function requireTenantId(
  tenantId: string | undefined | null,
  operation = 'database query'
): string {
  if (!tenantId || tenantId.trim() === '') {
    throw new TenantIsolationError(
      `Tenant ID is required for ${operation}. ` +
        'This is a programming error — ensure session middleware sets tenantId.',
      tenantId || '<missing>'
    );
  }
  return tenantId.trim();
}

/**
 * Assert that a fetched record's tenant_id matches the requesting tenant.
 * This is a defense-in-depth check beyond RLS — catches bugs where
 * a query accidentally omits the tenant_id predicate.
 *
 * @param record - The fetched record (must have tenant_id field)
 * @param expectedTenantId - The tenant ID from the request context
 * @param table - Optional table name for error reporting
 * @throws TenantIsolationError if tenant IDs don't match
 */
export function assertTenantMatch(
  record: { tenant_id?: string; tenantId?: string },
  expectedTenantId: string,
  table?: string
): void {
  const recordTenantId = record.tenant_id || record.tenantId;
  if (!recordTenantId) {
    throw new TenantIsolationError(
      `Record from ${table || 'unknown table'} has no tenant_id field. ` +
        'This may indicate a schema or query error.',
      expectedTenantId,
      table
    );
  }
  if (recordTenantId !== expectedTenantId) {
    throw new TenantIsolationError(
      `Tenant isolation violation on ${table || 'unknown table'}: ` +
        `record belongs to tenant ${recordTenantId} but was accessed by tenant ${expectedTenantId}`,
      expectedTenantId,
      table
    );
  }
}

/**
 * Check whether a table name is tenant-scoped.
 */
export function isTenantScoped(table: string): boolean {
  return (TENANT_SCOPED_TABLES as readonly string[]).includes(table);
}

/**
 * Check whether a table name is global (not tenant-scoped).
 */
export function isGlobalTable(table: string): boolean {
  return (GLOBAL_TABLES as readonly string[]).includes(table);
}
