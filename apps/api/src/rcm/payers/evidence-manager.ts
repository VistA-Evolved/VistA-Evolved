/**
 * Evidence Manager — Phase 95: Payer Registry Persistence + Audit
 *
 * Manages evidence artifacts (URLs, documents, screenshots) attached
 * to payer records. Provides:
 *   - SHA-256 hashing of evidence URLs for tamper detection
 *   - Provenance tracking (who added, when, from where)
 *   - Validation of evidence completeness per capability
 *   - Evidence coverage scoring for each payer
 *
 * No file upload in this phase — evidence is URL-based only.
 * File-backed persistence via payer-persistence integration.
 */

import { createHash } from 'node:crypto';
import type { HmoEvidence, HmoCapabilities, HmoCapabilityStatus } from './ph-hmo-registry.js';

/* ── Types ──────────────────────────────────────────────────── */

export interface EvidenceValidation {
  payerId: string;
  totalEvidence: number;
  byKind: Record<string, number>;
  coverageScore: number; // 0-100%: how many capabilities have backing evidence
  capabilitiesWithEvidence: string[];
  capabilitiesWithoutEvidence: string[];
  warnings: string[];
}

export interface EvidenceHash {
  url: string;
  hash: string;
  computedAt: string;
}

/* ── Capability-to-evidence mapping ─────────────────────────── */

/**
 * Maps capability fields to evidence kinds that would back them.
 * A capability is "evidenced" if at least one evidence item of a
 * matching kind exists for the payer.
 */
const CAPABILITY_EVIDENCE_MAP: Record<keyof HmoCapabilities, string[]> = {
  loa: ['loa_instructions', 'provider_portal', 'website'],
  eligibility: ['provider_portal', 'api_docs', 'website'],
  claimsSubmission: ['provider_portal', 'api_docs', 'loa_instructions'],
  claimStatus: ['provider_portal', 'api_docs', 'website'],
  remittance: ['provider_portal', 'api_docs', 'website'],
  memberPortal: ['website'],
  providerPortal: ['provider_portal', 'website'],
};

/* ── Hashing ────────────────────────────────────────────────── */

export function hashEvidence(evidence: HmoEvidence): EvidenceHash {
  const payload = JSON.stringify({
    kind: evidence.kind,
    url: evidence.url,
    title: evidence.title,
    retrievedAt: evidence.retrievedAt,
  });
  return {
    url: evidence.url,
    hash: createHash('sha256').update(payload).digest('hex'),
    computedAt: new Date().toISOString(),
  };
}

export function hashEvidenceList(evidenceList: HmoEvidence[]): EvidenceHash[] {
  return evidenceList.map(hashEvidence);
}

/* ── Validation ─────────────────────────────────────────────── */

export function validatePayerEvidence(
  payerId: string,
  capabilities: HmoCapabilities,
  evidence: HmoEvidence[]
): EvidenceValidation {
  const byKind: Record<string, number> = {};
  for (const e of evidence) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
  }

  const evidenceKinds: Set<string> = new Set(evidence.map((e) => e.kind));
  const capabilitiesWithEvidence: string[] = [];
  const capabilitiesWithoutEvidence: string[] = [];
  const warnings: string[] = [];

  const capKeys = Object.keys(CAPABILITY_EVIDENCE_MAP) as (keyof HmoCapabilities)[];
  for (const capKey of capKeys) {
    const status: HmoCapabilityStatus = capabilities[capKey];
    // Skip unavailable capabilities — no evidence needed
    if (status === 'unavailable') {
      continue;
    }

    const requiredKinds = CAPABILITY_EVIDENCE_MAP[capKey];
    const hasEvidence = requiredKinds.some((k) => evidenceKinds.has(k));

    if (hasEvidence) {
      capabilitiesWithEvidence.push(capKey);
    } else {
      capabilitiesWithoutEvidence.push(capKey);
      if (status !== 'unknown_publicly') {
        warnings.push(`${capKey} is "${status}" but has no backing evidence`);
      }
    }
  }

  const totalCheckable = capabilitiesWithEvidence.length + capabilitiesWithoutEvidence.length;
  const coverageScore =
    totalCheckable > 0 ? Math.round((capabilitiesWithEvidence.length / totalCheckable) * 100) : 0;

  return {
    payerId,
    totalEvidence: evidence.length,
    byKind,
    coverageScore,
    capabilitiesWithEvidence,
    capabilitiesWithoutEvidence,
    warnings,
  };
}

/* ── Deduplication ──────────────────────────────────────────── */

/**
 * Checks if an evidence item is already present (by URL match).
 * Returns true if a duplicate exists.
 */
export function isDuplicateEvidence(existing: HmoEvidence[], newItem: HmoEvidence): boolean {
  return existing.some((e) => e.url === newItem.url);
}

/**
 * Merge new evidence into existing list, skipping duplicates by URL.
 */
export function mergeEvidence(
  existing: HmoEvidence[],
  newItems: HmoEvidence[]
): {
  merged: HmoEvidence[];
  added: number;
  skipped: number;
} {
  const urls = new Set(existing.map((e) => e.url));
  const merged = [...existing];
  let added = 0;
  let skipped = 0;

  for (const item of newItems) {
    if (urls.has(item.url)) {
      skipped++;
    } else {
      merged.push(item);
      urls.add(item.url);
      added++;
    }
  }

  return { merged, added, skipped };
}

/* ── Scoring ────────────────────────────────────────────────── */

/**
 * Compute aggregate evidence score across all payers.
 */
export function computeRegistryEvidenceScore(
  payers: Array<{ payerId: string; capabilities: HmoCapabilities; evidence: HmoEvidence[] }>
): {
  totalPayers: number;
  averageCoverage: number;
  fullyEvidenced: number;
  zeroEvidence: number;
  perPayer: Array<{ payerId: string; score: number; total: number }>;
} {
  const perPayer: Array<{ payerId: string; score: number; total: number }> = [];
  let totalCoverage = 0;
  let fullyEvidenced = 0;
  let zeroEvidence = 0;

  for (const p of payers) {
    const validation = validatePayerEvidence(p.payerId, p.capabilities, p.evidence);
    perPayer.push({
      payerId: p.payerId,
      score: validation.coverageScore,
      total: validation.totalEvidence,
    });
    totalCoverage += validation.coverageScore;
    if (validation.coverageScore === 100) fullyEvidenced++;
    if (validation.totalEvidence === 0) zeroEvidence++;
  }

  return {
    totalPayers: payers.length,
    averageCoverage: payers.length > 0 ? Math.round(totalCoverage / payers.length) : 0,
    fullyEvidenced,
    zeroEvidence,
    perPayer: perPayer.sort((a, b) => a.score - b.score),
  };
}
