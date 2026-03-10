/**
 * Compliance Attestation Store -- Phase 440.
 *
 * In-memory store for compliance attestation records. Tracks which
 * compliance requirements have been attested to, by whom, and with
 * what evidence. Follows the same in-memory + FIFO eviction pattern
 * as imaging-worklist (Phase 23), telehealth rooms (Phase 30), etc.
 *
 * Each attestation is hash-chained for tamper detection.
 */

import { createHash, randomUUID } from 'crypto';
import type { RegulatoryFramework } from './types.js';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type AttestationStatus =
  | 'attested' // Requirement met and confirmed
  | 'expired' // Attestation past its review date
  | 'revoked' // Explicitly revoked
  | 'pending_review'; // Awaiting next periodic review

export interface ComplianceAttestation {
  id: string;
  /** Which regulatory framework */
  framework: RegulatoryFramework;
  /** Requirement ID from compliance-matrix.ts (e.g. "HIPAA-001") */
  requirementId: string;
  /** Requirement title for display */
  requirementTitle: string;
  /** Who attested */
  attestedBy: string;
  /** Role of attester */
  attesterRole: string;
  /** When attested (ISO 8601) */
  attestedAt: string;
  /** When this attestation expires / requires re-review */
  reviewDueAt: string;
  /** Current status */
  status: AttestationStatus;
  /** Evidence artifacts (file paths, URLs, or phase references) */
  evidence: AttestationEvidence[];
  /** Optional notes from the attester */
  notes?: string;
  /** Tenant scope */
  tenantId: string;
  /** Hash chain fields */
  prevHash: string;
  hash: string;
}

export interface AttestationEvidence {
  type: 'file' | 'url' | 'phase_ref' | 'test_result';
  path: string;
  description: string;
  /** When the evidence was collected */
  collectedAt: string;
}

export interface AttestationSummary {
  framework: RegulatoryFramework;
  total: number;
  attested: number;
  expired: number;
  revoked: number;
  pendingReview: number;
  coveragePercent: number;
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const MAX_STORE_SIZE = 5000;
const attestations = new Map<string, ComplianceAttestation>();
let lastHash = 'genesis';

function computeHash(entry: Omit<ComplianceAttestation, 'hash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    framework: entry.framework,
    requirementId: entry.requirementId,
    attestedBy: entry.attestedBy,
    attestedAt: entry.attestedAt,
    status: entry.status,
    prevHash: entry.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create a new compliance attestation.
 */
export function createAttestation(params: {
  framework: RegulatoryFramework;
  requirementId: string;
  requirementTitle: string;
  attestedBy: string;
  attesterRole: string;
  evidence: AttestationEvidence[];
  notes?: string;
  tenantId?: string;
  reviewIntervalDays?: number;
}): ComplianceAttestation {
  // FIFO eviction
  if (attestations.size >= MAX_STORE_SIZE) {
    const oldest = attestations.keys().next().value;
    if (oldest) attestations.delete(oldest);
  }

  const now = new Date();
  const reviewDays = params.reviewIntervalDays || 90; // Default 90-day review cycle
  const reviewDue = new Date(now.getTime() + reviewDays * 86_400_000);

  const entry: Omit<ComplianceAttestation, 'hash'> = {
    id: randomUUID(),
    framework: params.framework,
    requirementId: params.requirementId,
    requirementTitle: params.requirementTitle,
    attestedBy: params.attestedBy,
    attesterRole: params.attesterRole,
    attestedAt: now.toISOString(),
    reviewDueAt: reviewDue.toISOString(),
    status: 'attested',
    evidence: params.evidence,
    notes: params.notes,
    tenantId: params.tenantId || 'default',
    prevHash: lastHash,
  };

  const hash = computeHash(entry);
  const attestation: ComplianceAttestation = { ...entry, hash };
  lastHash = hash;

  attestations.set(attestation.id, attestation);
  return attestation;
}

/**
 * Get attestation by ID.
 */
export function getAttestation(id: string): ComplianceAttestation | undefined {
  return attestations.get(id);
}

export function getAttestationForTenant(
  tenantId: string,
  id: string
): ComplianceAttestation | undefined {
  const attestation = attestations.get(id);
  if (!attestation || attestation.tenantId !== tenantId) return undefined;
  return attestation;
}

/**
 * List attestations with optional filters.
 */
export function listAttestations(filters?: {
  framework?: RegulatoryFramework;
  status?: AttestationStatus;
  tenantId?: string;
  requirementId?: string;
  limit?: number;
  offset?: number;
}): { items: ComplianceAttestation[]; total: number } {
  let items = [...attestations.values()];

  if (filters?.framework) items = items.filter((a) => a.framework === filters.framework);
  if (filters?.status) items = items.filter((a) => a.status === filters.status);
  if (filters?.tenantId) items = items.filter((a) => a.tenantId === filters.tenantId);
  if (filters?.requirementId)
    items = items.filter((a) => a.requirementId === filters.requirementId);

  const total = items.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

/**
 * Revoke an attestation (e.g. when a control is found to be non-compliant).
 */
export function revokeAttestation(
  tenantId: string,
  id: string,
  revokedBy: string,
  reason?: string
): boolean {
  const att = getAttestationForTenant(tenantId, id);
  if (!att || att.status === 'revoked') return false;
  att.status = 'revoked';
  att.notes = (att.notes || '') + ` | Revoked by ${revokedBy}: ${reason || 'no reason given'}`;
  return true;
}

/**
 * Check and mark attestations that are past their review date as expired.
 */
export function checkExpiredAttestations(): number {
  const now = new Date().toISOString();
  let expired = 0;
  for (const att of attestations.values()) {
    if (att.status === 'attested' && att.reviewDueAt < now) {
      att.status = 'expired';
      expired++;
    }
  }
  return expired;
}

/**
 * Get summary statistics per framework.
 */
export function getAttestationSummary(tenantId?: string): AttestationSummary[] {
  const byFramework = new Map<RegulatoryFramework, AttestationSummary>();
  for (const att of attestations.values()) {
    if (tenantId && att.tenantId !== tenantId) continue;
    let summary = byFramework.get(att.framework);
    if (!summary) {
      summary = {
        framework: att.framework,
        total: 0,
        attested: 0,
        expired: 0,
        revoked: 0,
        pendingReview: 0,
        coveragePercent: 0,
      };
      byFramework.set(att.framework, summary);
    }
    summary.total++;
    if (att.status === 'attested') summary.attested++;
    if (att.status === 'expired') summary.expired++;
    if (att.status === 'revoked') summary.revoked++;
    if (att.status === 'pending_review') summary.pendingReview++;
  }

  // Calculate coverage
  for (const summary of byFramework.values()) {
    summary.coveragePercent =
      summary.total > 0 ? Math.round((summary.attested / summary.total) * 100) : 0;
  }

  return [...byFramework.values()];
}

/**
 * Verify hash chain integrity.
 */
export function verifyAttestationChain(): { valid: boolean; brokenAt?: string; checked: number } {
  const entries = [...attestations.values()];
  for (const entry of entries) {
    const { hash: _h, ...rest } = entry;
    const expected = computeHash(rest);
    if (expected !== entry.hash) {
      return { valid: false, brokenAt: entry.id, checked: entries.indexOf(entry) };
    }
  }
  return { valid: true, checked: entries.length };
}

/**
 * Reset store (for testing).
 */
export function _resetAttestationStore(): void {
  attestations.clear();
  lastHash = 'genesis';
}
