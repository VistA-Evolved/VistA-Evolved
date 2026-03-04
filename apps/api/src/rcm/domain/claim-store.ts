/**
 * RCM — Claim Store (Hybrid: In-Memory Cache + DB)
 *
 * Phase 38: In-memory claim lifecycle store.
 * Phase 121: Durability Wave 1 — hybrid cache + DB persistence.
 *
 * Pattern: In-memory Map as hot cache, DB as durable backing store.
 * Write-through: every mutation writes to both cache and DB.
 * Read: cache-first, DB fallback on cache miss.
 * Graceful degradation: if DB not wired, falls back to cache-only.
 *
 * Migration plan:
 * 1. Current: Hybrid — SQLite (or PG) + in-memory cache
 * 2. Next: Persist to VistA ^IB / ^PRCA globals via custom M routine
 * 3. Future: Hybrid — VistA for charges/AR, overlay store for EDI lifecycle
 * 4. Production: PostgreSQL or VistA-native with EDI gateway integration
 */

import type { Claim, ClaimStatus } from './claim.js';
import type { Remittance } from './remit.js';
import { log } from '../../lib/logger.js';

/* ── DB repo interface (lazy-wired at startup) ──────────────── */

interface ClaimRepo {
  insertClaim(data: any): any;
  findClaimById(id: string): any;
  findClaimsByTenant(tenantId: string, opts?: any): any;
  updateClaim(id: string, updates: any): any;
  countClaimsByTenant(tenantId: string): any;
  countAllClaims(): any;
  insertRemittance(data: any): any;
  findRemittanceById(id: string): any;
  findRemittancesByTenant(tenantId: string, limit?: number, offset?: number): any;
  updateRemittance(id: string, updates: any): any;
  countAllRemittances(): any;
  countRemittancesByTenant?(tenantId: string): any;
}

let dbRepo: ClaimRepo | null = null;

/** Called from index.ts after initPlatformDb() */
export function initClaimStoreRepo(repo: ClaimRepo): void {
  dbRepo = repo;
  // Hydrate cache from DB on init
  try {
    // We don't hydrate the full cache here — we rely on cache-miss → DB fallback
  } catch (_) {
    // DB read failed — cache-only mode
  }
}

function dbWarn(op: string, err: any): void {
  if (process.env.NODE_ENV !== 'test') {
    log.warn(`[claim-store] DB ${op} failed (cache-only fallback)`, { err: err?.message ?? err });
  }
}

/* ── Claim Store ────────────────────────────────────────────── */

const claims = new Map<string, Claim>();
const remittances = new Map<string, Remittance>();

// Index: tenantId → claim IDs
const tenantClaimIndex = new Map<string, Set<string>>();

/* ── Helper: Claim → DB row conversion ──────────────────────── */

function claimToDbRow(claim: Claim): Record<string, unknown> {
  return {
    id: claim.id,
    tenantId: claim.tenantId,
    claimType: claim.claimType,
    status: claim.status,
    patientDfn: claim.patientDfn,
    patientName: claim.patientName,
    patientDob: claim.patientDob,
    patientFirstName: claim.patientFirstName,
    patientLastName: claim.patientLastName,
    patientGender: claim.patientGender,
    subscriberId: claim.subscriberId,
    billingProviderNpi: claim.billingProviderNpi,
    renderingProviderNpi: claim.renderingProviderNpi,
    facilityNpi: claim.facilityNpi,
    facilityName: claim.facilityName,
    facilityTaxId: claim.facilityTaxId,
    payerId: claim.payerId,
    payerName: claim.payerName,
    payerClaimId: claim.payerClaimId,
    dateOfService: claim.dateOfService,
    diagnosesJson: JSON.stringify(claim.diagnoses ?? []),
    linesJson: JSON.stringify(claim.lines ?? []),
    totalCharge: claim.totalCharge,
    ediTransactionId: claim.ediTransactionId,
    connectorId: claim.connectorId,
    submittedAt: claim.submittedAt,
    responseReceivedAt: claim.responseReceivedAt,
    paidAmount: claim.paidAmount,
    adjustmentAmount: claim.adjustmentAmount,
    patientResponsibility: claim.patientResponsibility,
    remitDate: claim.remitDate,
    vistaChargeIen: claim.vistaChargeIen,
    vistaArIen: claim.vistaArIen,
    validationResultJson: claim.validationResult
      ? JSON.stringify(claim.validationResult)
      : undefined,
    pipelineEntryId: claim.pipelineEntryId,
    exportArtifactPath: claim.exportArtifactPath,
    isDemo: claim.isDemo,
    submissionSafetyMode: claim.submissionSafetyMode,
    isMock: claim.isMock,
    auditTrailJson: JSON.stringify(claim.auditTrail ?? []),
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

function dbRowToClaim(row: any): Claim {
  const { diagnosesJson, linesJson, auditTrailJson, validationResultJson, ...rest } = row;
  return {
    ...rest,
    diagnoses: JSON.parse(diagnosesJson ?? '[]'),
    lines: JSON.parse(linesJson ?? '[]'),
    auditTrail: JSON.parse(auditTrailJson ?? '[]'),
    validationResult: validationResultJson ? JSON.parse(validationResultJson) : undefined,
    isDemo: Boolean(rest.isDemo),
    isMock: Boolean(rest.isMock),
  } as Claim;
}

/* ── Claims CRUD ────────────────────────────────────────────── */

export function storeClaim(claim: Claim): void {
  claims.set(claim.id, claim);
  if (!tenantClaimIndex.has(claim.tenantId)) {
    tenantClaimIndex.set(claim.tenantId, new Set());
  }
  tenantClaimIndex.get(claim.tenantId)!.add(claim.id);

  // Write-through to DB
  if (dbRepo) {
    try {
      dbRepo.insertClaim(claimToDbRow(claim));
    } catch (e) {
      dbWarn('insertClaim', e);
    }
  }
}

export function getClaim(id: string): Claim | undefined {
  // Cache-first
  const cached = claims.get(id);
  if (cached) return cached;

  // DB fallback
  if (dbRepo) {
    try {
      const row = dbRepo.findClaimById(id);
      if (row) {
        const claim = dbRowToClaim(row);
        // Rehydrate cache
        claims.set(claim.id, claim);
        if (!tenantClaimIndex.has(claim.tenantId)) {
          tenantClaimIndex.set(claim.tenantId, new Set());
        }
        tenantClaimIndex.get(claim.tenantId)!.add(claim.id);
        return claim;
      }
    } catch (e) {
      dbWarn('findClaimById', e);
    }
  }
  return undefined;
}

export function updateClaim(claim: Claim): void {
  claims.set(claim.id, claim);

  // Write-through to DB
  if (dbRepo) {
    try {
      dbRepo.updateClaim(claim.id, {
        status: claim.status,
        payerClaimId: claim.payerClaimId,
        ediTransactionId: claim.ediTransactionId,
        connectorId: claim.connectorId,
        submittedAt: claim.submittedAt,
        responseReceivedAt: claim.responseReceivedAt,
        paidAmount: claim.paidAmount,
        adjustmentAmount: claim.adjustmentAmount,
        patientResponsibility: claim.patientResponsibility,
        remitDate: claim.remitDate,
        validationResultJson: claim.validationResult
          ? JSON.stringify(claim.validationResult)
          : undefined,
        pipelineEntryId: claim.pipelineEntryId,
        exportArtifactPath: claim.exportArtifactPath,
        submissionSafetyMode: claim.submissionSafetyMode,
        auditTrailJson: JSON.stringify(claim.auditTrail ?? []),
        diagnosesJson: JSON.stringify(claim.diagnoses ?? []),
        linesJson: JSON.stringify(claim.lines ?? []),
        totalCharge: claim.totalCharge,
      });
    } catch (e) {
      dbWarn('updateClaim', e);
    }
  }
}

export function listClaims(
  tenantId: string,
  filters?: {
    status?: ClaimStatus;
    patientDfn?: string;
    payerId?: string;
    limit?: number;
    offset?: number;
  }
): { claims: Claim[]; total: number } {
  const ids = tenantClaimIndex.get(tenantId);
  if (!ids || ids.size === 0) {
    // Try DB if cache is empty
    if (dbRepo) {
      try {
        const rows = dbRepo.findClaimsByTenant(tenantId, {
          status: filters?.status,
          patientDfn: filters?.patientDfn,
          payerId: filters?.payerId,
          limit: filters?.limit ?? 50,
          offset: filters?.offset ?? 0,
        });
        const total = dbRepo.countClaimsByTenant(tenantId);
        const claimsResult = rows.map(dbRowToClaim);
        // Rehydrate cache
        for (const c of claimsResult) {
          claims.set(c.id, c);
          if (!tenantClaimIndex.has(c.tenantId)) tenantClaimIndex.set(c.tenantId, new Set());
          tenantClaimIndex.get(c.tenantId)!.add(c.id);
        }
        return { claims: claimsResult, total };
      } catch (e) {
        dbWarn('findClaimsByTenant', e);
      }
    }
    return { claims: [], total: 0 };
  }

  let result = Array.from(ids)
    .map((id) => claims.get(id)!)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (filters?.status) result = result.filter((c) => c.status === filters.status);
  if (filters?.patientDfn) result = result.filter((c) => c.patientDfn === filters.patientDfn);
  if (filters?.payerId) result = result.filter((c) => c.payerId === filters.payerId);

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

function remitToDbRow(remit: Remittance): Record<string, unknown> {
  return {
    id: remit.id,
    tenantId: remit.tenantId,
    status: remit.status,
    ediTransactionId: remit.ediTransactionId,
    checkNumber: remit.checkNumber,
    checkDate: remit.checkDate,
    eftTraceNumber: remit.eftTraceNumber,
    payerId: remit.payerId,
    payerName: remit.payerName,
    claimId: remit.claimId,
    payerClaimId: remit.payerClaimId,
    patientDfn: remit.patientDfn,
    totalCharged: remit.totalCharged,
    totalPaid: remit.totalPaid,
    totalAdjusted: remit.totalAdjusted,
    totalPatientResponsibility: remit.totalPatientResponsibility,
    serviceLinesJson: JSON.stringify(remit.serviceLines ?? []),
    isMock: remit.isMock,
    importedAt: remit.importedAt,
    matchedAt: remit.matchedAt,
    postedAt: remit.postedAt,
    createdAt: remit.createdAt,
    updatedAt: remit.updatedAt,
  };
}

export function storeRemittance(remit: Remittance): void {
  remittances.set(remit.id, remit);

  if (dbRepo) {
    try {
      dbRepo.insertRemittance(remitToDbRow(remit));
    } catch (e) {
      dbWarn('insertRemittance', e);
    }
  }
}

export function getRemittance(id: string): Remittance | undefined {
  const cached = remittances.get(id);
  if (cached) return cached;

  if (dbRepo) {
    try {
      const row = dbRepo.findRemittanceById(id);
      if (row) {
        const { serviceLinesJson, ...rest } = row;
        const remit = {
          ...rest,
          serviceLines: JSON.parse(serviceLinesJson ?? '[]'),
          isMock: Boolean(rest.isMock),
        } as Remittance;
        remittances.set(remit.id, remit);
        return remit;
      }
    } catch (e) {
      dbWarn('findRemittanceById', e);
    }
  }
  return undefined;
}

export function listRemittances(
  tenantId: string,
  limit = 50,
  offset = 0
): { remittances: Remittance[]; total: number } {
  const all = Array.from(remittances.values())
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  if (all.length === 0 && dbRepo) {
    try {
      const rows = dbRepo.findRemittancesByTenant(tenantId, limit, offset);
      const result = rows.map((r: any) => {
        const { serviceLinesJson, ...rest } = r;
        return {
          ...rest,
          serviceLines: JSON.parse(serviceLinesJson ?? '[]'),
          isMock: Boolean(rest.isMock),
        } as Remittance;
      });
      for (const rem of result) remittances.set(rem.id, rem);
      // Count total from DB (not paginated length)
      let dbTotal = result.length;
      if (dbRepo) {
        try {
          dbTotal = dbRepo.countRemittancesByTenant
            ? dbRepo.countRemittancesByTenant(tenantId)
            : result.length;
        } catch (_) {
          /* fallback to result.length */
        }
      }
      return { remittances: result, total: dbTotal };
    } catch (e) {
      dbWarn('findRemittancesByTenant', e);
    }
  }

  return {
    remittances: all.slice(offset, offset + limit),
    total: all.length,
  };
}

/** Link a remittance to a claim by matching payerClaimId */
export function matchRemittanceToClaim(remitId: string, claimId: string): boolean {
  const remit = getRemittance(remitId);
  const claim = getClaim(claimId);
  if (!remit || !claim) return false;

  remit.claimId = claimId;
  remit.matchedAt = new Date().toISOString();
  remit.status = 'matched';
  remittances.set(remitId, remit);

  if (dbRepo) {
    try {
      dbRepo.updateRemittance(remitId, {
        claimId,
        matchedAt: remit.matchedAt,
        status: 'matched',
      });
    } catch (e) {
      dbWarn('updateRemittance', e);
    }
  }

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
