/**
 * tenant-guard.ts -- Phase 122/174: Tenant Isolation Enforcement
 *
 * Application-layer tenant isolation guards. In PG-only mode, RLS enforces
 * tenant isolation at the database level, but these guards provide defense-
 * in-depth at the application layer.
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
 * PG RLS enforces isolation at the database level; these lists provide
 * documentation and CI gate verification.
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
 * PG RLS does not cover these until they gain a tenant_id column.
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
