/**
 * RCM — Claim Store (In-Memory)
 *
 * Phase 38: In-memory claim lifecycle store.
 * Resets on API restart — matches the imaging-worklist pattern (Phase 23).
 *
 * Migration plan:
 * 1. Current: In-memory Map<> store
 * 2. Next: Persist to VistA ^IB / ^PRCA globals via custom M routine
 * 3. Future: Hybrid — VistA for charges/AR, overlay store for EDI lifecycle
 * 4. Production: PostgreSQL or VistA-native with EDI gateway integration
 */

import type { Claim, ClaimStatus } from "./claim.js";
import type { Remittance } from "./remit.js";

/* ── Claim Store ────────────────────────────────────────────── */

const claims = new Map<string, Claim>();
const remittances = new Map<string, Remittance>();

// Index: tenantId → claim IDs
const tenantClaimIndex = new Map<string, Set<string>>();

/* ── Claims CRUD ────────────────────────────────────────────── */

export function storeClaim(claim: Claim): void {
  claims.set(claim.id, claim);
  if (!tenantClaimIndex.has(claim.tenantId)) {
    tenantClaimIndex.set(claim.tenantId, new Set());
  }
  tenantClaimIndex.get(claim.tenantId)!.add(claim.id);
}

export function getClaim(id: string): Claim | undefined {
  return claims.get(id);
}

export function updateClaim(claim: Claim): void {
  claims.set(claim.id, claim);
}

export function listClaims(
  tenantId: string,
  filters?: {
    status?: ClaimStatus;
    patientDfn?: string;
    payerId?: string;
    limit?: number;
    offset?: number;
  },
): { claims: Claim[]; total: number } {
  const ids = tenantClaimIndex.get(tenantId);
  if (!ids) return { claims: [], total: 0 };

  let result = Array.from(ids)
    .map(id => claims.get(id)!)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (filters?.status) result = result.filter(c => c.status === filters.status);
  if (filters?.patientDfn) result = result.filter(c => c.patientDfn === filters.patientDfn);
  if (filters?.payerId) result = result.filter(c => c.payerId === filters.payerId);

  const total = result.length;
  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? 50;
  result = result.slice(offset, offset + limit);

  return { claims: result, total };
}

export function getClaimStats(tenantId: string): Record<ClaimStatus, number> {
  const stats: Record<string, number> = {};
  const ids = tenantClaimIndex.get(tenantId);
  if (!ids) return stats as Record<ClaimStatus, number>;
  for (const id of ids) {
    const c = claims.get(id);
    if (c) stats[c.status] = (stats[c.status] ?? 0) + 1;
  }
  return stats as Record<ClaimStatus, number>;
}

/* ── Remittances ────────────────────────────────────────────── */

export function storeRemittance(remit: Remittance): void {
  remittances.set(remit.id, remit);
}

export function getRemittance(id: string): Remittance | undefined {
  return remittances.get(id);
}

export function listRemittances(
  tenantId: string,
  limit = 50,
  offset = 0,
): { remittances: Remittance[]; total: number } {
  const all = Array.from(remittances.values())
    .filter(r => r.tenantId === tenantId)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  return {
    remittances: all.slice(offset, offset + limit),
    total: all.length,
  };
}

/** Link a remittance to a claim by matching payerClaimId */
export function matchRemittanceToClaim(
  remitId: string,
  claimId: string,
): boolean {
  const remit = remittances.get(remitId);
  const claim = claims.get(claimId);
  if (!remit || !claim) return false;

  remit.claimId = claimId;
  remit.matchedAt = new Date().toISOString();
  remit.status = "matched";
  remittances.set(remitId, remit);
  return true;
}

/* ── Store stats ────────────────────────────────────────────── */

export function getStoreStats(): {
  totalClaims: number;
  totalRemittances: number;
  tenants: number;
} {
  return {
    totalClaims: claims.size,
    totalRemittances: remittances.size,
    tenants: tenantClaimIndex.size,
  };
}

/** Reset all stores — used in tests */
export function resetClaimStore(): void {
  claims.clear();
  remittances.clear();
  tenantClaimIndex.clear();
}
