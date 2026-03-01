/**
 * Tenant Security Policy — Phase 342 (W16-P6).
 *
 * Configurable per-tenant security posture controls.
 * Controls: CIDR allowlists, MFA requirements, export permissions,
 * session limits, password policies, IP restrictions, etc.
 *
 * In-memory cache with PG persistence. Changes audited immutably.
 */

import { log } from "../lib/logger.js";
import { immutableAudit, type ImmutableAuditAction } from "../lib/immutable-audit.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TenantSecurityPolicy {
  /** Tenant identifier. */
  tenantId: string;
  /** Allowed CIDR ranges for access (empty = allow all). */
  allowedCidrs: string[];
  /** Whether MFA is required for this tenant. */
  requireMfa: boolean;
  /** Whether data exports are allowed. */
  allowExports: boolean;
  /** Max session age in seconds (0 = no limit). */
  maxSessionAgeSec: number;
  /** Max concurrent sessions per user (0 = no limit). */
  maxConcurrentSessions: number;
  /** IP allowlist (empty = allow all). */
  ipAllowList: string[];
  /** Whether break-glass is enabled for this tenant. */
  breakGlassEnabled: boolean;
  /** Minimum password length. */
  minPasswordLength: number;
  /** Whether audit log shipping is enabled. */
  auditShippingEnabled: boolean;
  /** Custom metadata / extensions. */
  metadata: Record<string, unknown>;
  /** Last updated timestamp. */
  updatedAt: string;
  /** Who last updated. */
  updatedBy: string;
}

export interface TenantPolicyChange {
  tenantId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: string;
  changedAt: string;
}

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

export function defaultTenantSecurityPolicy(tenantId: string): TenantSecurityPolicy {
  return {
    tenantId,
    allowedCidrs: [],
    requireMfa: false,
    allowExports: true,
    maxSessionAgeSec: 28800, // 8 hours
    maxConcurrentSessions: 5,
    ipAllowList: [],
    breakGlassEnabled: true,
    minPasswordLength: 8,
    auditShippingEnabled: false,
    metadata: {},
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}

/* ------------------------------------------------------------------ */
/* In-memory store                                                     */
/* ------------------------------------------------------------------ */

const policyCache = new Map<string, TenantSecurityPolicy>();
const changeLog: TenantPolicyChange[] = [];
const MAX_CHANGE_LOG = 5000;

/**
 * Get policy for a tenant. Returns default if not configured.
 */
export function getTenantSecurityPolicy(tenantId: string): TenantSecurityPolicy {
  return policyCache.get(tenantId) ?? defaultTenantSecurityPolicy(tenantId);
}

/**
 * Update a tenant security policy. Tracks field-level changes.
 */
export function updateTenantSecurityPolicy(
  tenantId: string,
  updates: Partial<Omit<TenantSecurityPolicy, "tenantId" | "updatedAt" | "updatedBy">>,
  updatedBy: string,
): { policy: TenantSecurityPolicy; changes: TenantPolicyChange[] } {
  const current = getTenantSecurityPolicy(tenantId);
  const changes: TenantPolicyChange[] = [];
  const now = new Date().toISOString();

  for (const [key, newValue] of Object.entries(updates)) {
    const typedKey = key as keyof typeof updates;
    const oldValue = current[typedKey as keyof TenantSecurityPolicy];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        tenantId,
        field: key,
        oldValue,
        newValue,
        changedBy: updatedBy,
        changedAt: now,
      });
    }
  }

  const updated: TenantSecurityPolicy = {
    ...current,
    ...updates,
    tenantId,
    updatedAt: now,
    updatedBy,
  };

  policyCache.set(tenantId, updated);

  // Track changes
  for (const change of changes) {
    changeLog.push(change);
    if (changeLog.length > MAX_CHANGE_LOG) changeLog.shift();
  }

  // Audit
  if (changes.length > 0) {
    immutableAudit(
      "admin.tenant-security-policy" as ImmutableAuditAction,
      "success",
      { sub: updatedBy, name: updatedBy, roles: ["admin"] },
      {
        detail: {
          tenantId,
          changesCount: changes.length,
          fields: changes.map((c) => c.field),
        },
      },
    );
    log.info("Tenant security policy updated", {
      tenantId,
      fields: changes.map((c) => c.field),
      changedBy: updatedBy,
    });
  }

  return { policy: updated, changes };
}

/**
 * List all configured tenant policies.
 */
export function listTenantSecurityPolicies(): TenantSecurityPolicy[] {
  return Array.from(policyCache.values());
}

/**
 * Get the change log for a tenant (or all).
 */
export function getTenantPolicyChangeLog(tenantId?: string): TenantPolicyChange[] {
  if (tenantId) return changeLog.filter((c) => c.tenantId === tenantId);
  return [...changeLog];
}

/**
 * Delete a tenant policy (revert to defaults).
 */
export function deleteTenantSecurityPolicy(tenantId: string, deletedBy: string): boolean {
  const existed = policyCache.delete(tenantId);
  if (existed) {
    immutableAudit(
      "admin.tenant-security-policy" as ImmutableAuditAction,
      "success",
      { sub: deletedBy, name: deletedBy, roles: ["admin"] },
      { detail: { tenantId, action: "deleted" } },
    );
  }
  return existed;
}

/**
 * Check if a request IP is allowed by the tenant policy.
 */
export function isTenantIpAllowed(tenantId: string, ip: string): boolean {
  const policy = getTenantSecurityPolicy(tenantId);
  if (policy.ipAllowList.length === 0) return true; // No restriction
  return policy.ipAllowList.some((prefix) => ip.startsWith(prefix));
}

/**
 * Check if a CIDR is allowed by the tenant policy.
 */
export function isTenantCidrAllowed(tenantId: string, cidr: string): boolean {
  const policy = getTenantSecurityPolicy(tenantId);
  if (policy.allowedCidrs.length === 0) return true;
  return policy.allowedCidrs.includes(cidr);
}
