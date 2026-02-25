/**
 * tenant-scoped-queries.ts -- Phase 122: Tenant Isolation Enforcement
 *
 * Tenant-scoped wrappers around repo PK lookups that enforce tenant_id
 * ownership checks. These complement the existing repo functions by
 * adding a tenant boundary to PK-based reads and writes.
 *
 * SQLite has no RLS, so enforcement is at the application layer.
 * PG mode uses native RLS (Phase 101/104); these guards provide
 * defense-in-depth even when PG RLS is active.
 *
 * Pattern:
 *   findXxxById(id)                  → raw PK lookup (admin/internal only)
 *   findXxxByIdForTenant(id, tid)    → tenant-guarded (route handlers use this)
 *   updateXxxForTenant(id, tid, ...) → tenant-guarded update
 */

import { requireTenantId, assertTenantMatch, TenantIsolationError } from "./tenant-guard.js";
import * as claimRepo from "./rcm-claim-repo.js";
import * as caseRepo from "./rcm-claim-case-repo.js";
import * as wqRepo from "./workqueue-repo.js";

/* ── RCM Claims ────────────────────────────────────────────── */

export function findClaimByIdForTenant(
  id: string,
  tenantId: string,
): claimRepo.RcmClaimRow | undefined {
  requireTenantId(tenantId, "findClaimByIdForTenant");
  const row = claimRepo.findClaimById(id);
  if (!row) return undefined;
  assertTenantMatch(row, tenantId, "rcm_claim");
  return row;
}

export function updateClaimForTenant(
  id: string,
  tenantId: string,
  updates: Parameters<typeof claimRepo.updateClaim>[1],
): claimRepo.RcmClaimRow | undefined {
  requireTenantId(tenantId, "updateClaimForTenant");
  // Verify ownership first
  const existing = claimRepo.findClaimById(id);
  if (!existing) return undefined;
  assertTenantMatch(existing, tenantId, "rcm_claim.update");
  return claimRepo.updateClaim(id, updates);
}

/* ── RCM Remittances ───────────────────────────────────────── */

export function findRemittanceByIdForTenant(
  id: string,
  tenantId: string,
): claimRepo.RcmRemittanceRow | undefined {
  requireTenantId(tenantId, "findRemittanceByIdForTenant");
  const row = claimRepo.findRemittanceById(id);
  if (!row) return undefined;
  assertTenantMatch(row, tenantId, "rcm_remittance");
  return row;
}

export function updateRemittanceForTenant(
  id: string,
  tenantId: string,
  updates: Parameters<typeof claimRepo.updateRemittance>[1],
): claimRepo.RcmRemittanceRow | undefined {
  requireTenantId(tenantId, "updateRemittanceForTenant");
  const existing = claimRepo.findRemittanceById(id);
  if (!existing) return undefined;
  assertTenantMatch(existing, tenantId, "rcm_remittance.update");
  return claimRepo.updateRemittance(id, updates);
}

/* ── Claim Cases ───────────────────────────────────────────── */

export function findClaimCaseByIdForTenant(
  id: string,
  tenantId: string,
): caseRepo.RcmClaimCaseRow | undefined {
  requireTenantId(tenantId, "findClaimCaseByIdForTenant");
  const row = caseRepo.findClaimCaseById(id);
  if (!row) return undefined;
  assertTenantMatch(row, tenantId, "rcm_claim_case");
  return row;
}

export function updateClaimCaseForTenant(
  id: string,
  tenantId: string,
  updates: Parameters<typeof caseRepo.updateClaimCase>[1],
): caseRepo.RcmClaimCaseRow | undefined {
  requireTenantId(tenantId, "updateClaimCaseForTenant");
  const existing = caseRepo.findClaimCaseById(id);
  if (!existing) return undefined;
  assertTenantMatch(existing, tenantId, "rcm_claim_case.update");
  return caseRepo.updateClaimCase(id, updates);
}

/* ── Work Queue ────────────────────────────────────────────── */

export function findWorkItemByIdForTenant(
  id: string,
  tenantId: string,
): wqRepo.WorkItemRow | undefined {
  requireTenantId(tenantId, "findWorkItemByIdForTenant");
  const row = wqRepo.findWorkItemById(id);
  if (!row) return undefined;
  assertTenantMatch(row, tenantId, "rcm_work_item");
  return row;
}

export function updateWorkItemForTenant(
  id: string,
  tenantId: string,
  updates: Parameters<typeof wqRepo.updateWorkItem>[1],
  actor?: string,
): wqRepo.WorkItemRow | undefined {
  requireTenantId(tenantId, "updateWorkItemForTenant");
  const existing = wqRepo.findWorkItemById(id);
  if (!existing) return undefined;
  assertTenantMatch(existing, tenantId, "rcm_work_item.update");
  return wqRepo.updateWorkItem(id, updates, actor);
}

export function findWorkItemsForClaimInTenant(
  claimId: string,
  tenantId: string,
): wqRepo.WorkItemRow[] {
  requireTenantId(tenantId, "findWorkItemsForClaimInTenant");
  // Filter results by tenant since the base function doesn't scope
  const all = wqRepo.findWorkItemsForClaim(claimId);
  return all.filter((row) => row.tenantId === tenantId);
}

export function getEventsForWorkItemInTenant(
  workItemId: string,
  tenantId: string,
): wqRepo.WorkItemEventRow[] {
  requireTenantId(tenantId, "getEventsForWorkItemInTenant");
  // Verify the work item belongs to tenant first
  const item = wqRepo.findWorkItemById(workItemId);
  if (!item) return [];
  assertTenantMatch(item, tenantId, "rcm_work_item_event");
  return wqRepo.getEventsForWorkItem(workItemId);
}
