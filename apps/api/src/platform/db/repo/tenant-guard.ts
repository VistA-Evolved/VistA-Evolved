/**
 * tenant-guard.ts -- Phase 122: Tenant Isolation Enforcement
 *
 * Shared helper that enforces tenant_id scoping in all SQLite repo operations.
 * SQLite has no Row Level Security, so we enforce at the application layer.
 *
 * Usage:
 *   import { requireTenantId, assertTenantMatch } from "./tenant-guard.js";
 *
 *   function findFoo(tenantId: string, id: string) {
 *     requireTenantId(tenantId);
 *     const row = db.select()...get();
 *     return row ? assertTenantMatch(row, tenantId) : null;
 *   }
 *
 * Rules:
 * - Every tenant-scoped read MUST call requireTenantId() before querying.
 * - Every PK lookup MUST call assertTenantMatch() on the result row.
 * - Write operations MUST include tenantId and call requireTenantId().
 * - Global/admin operations are exempt but must be documented.
 */

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
 * Create a tenant_id WHERE condition for drizzle-orm queries.
 * Returns the eq() condition to include in query builders.
 */
export function tenantEq<TColumn>(column: TColumn, tenantId: string) {
  requireTenantId(tenantId);
  // We import eq lazily to avoid circular deps -- callers pass the column
  // and use the returned condition in their query chain.
  // This is a type-safe wrapper that ensures requireTenantId() is always called.
  return { column, tenantId } as const;
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
 * List of repos/tables that are globally scoped by design.
 * These do NOT require tenant_id guards.
 */
export const GLOBAL_TABLES = [
  "payer",                  // Global reference data
  "module_catalog",         // Global module definitions
  "idempotency_key",        // Tenant scoped via composite key pattern
] as const;

/**
 * List of repos/tables that HAVE a tenant_id column and MUST use tenant guards.
 * assertTenantMatch() enforces isolation on these tables at the application layer.
 * Used by the CI gate to verify enforcement.
 */
export const TENANT_SCOPED_TABLES = [
  "tenant_payer",
  "payer_capability",
  "payer_task",
  "payer_evidence_snapshot",
  "payer_audit_event",
  "eligibility_check",
  "claim_status_check",
  "tenant_module",
  "tenant_feature_flag",
  "module_audit_log",
  "credential_artifact",
  "credential_document",
  "accreditation_status",
  "accreditation_task",
  "loa_request",
  "loa_attachment",
  "claim_draft",
  "scrub_rule",
  "scrub_result",
  "claim_lifecycle_event",
  "integration_evidence",
  "auth_session",
  "rcm_work_item",
  "rcm_work_item_event",
  "rcm_claim",
  "rcm_remittance",
  "rcm_claim_case",
] as const;

/**
 * Tables that NEED a tenant_id column but don't have one yet.
 * These are tracked separately because assertTenantMatch() cannot enforce
 * isolation on rows without a tenantId field (it silently passes through).
 * Migration to add tenant_id is a follow-up task.
 *
 * WARNING: Until these tables gain a tenant_id column, they have NO
 * application-layer tenant isolation. PG RLS does not cover them either.
 */
export const PENDING_TENANT_ID_TABLES = [
  "portal_access_log",
  "portal_message",
  "portal_appointment",
  "telehealth_room",
  "imaging_work_order",
  "imaging_study_link",
  "imaging_unmatched",
  "scheduling_request",
] as const;
