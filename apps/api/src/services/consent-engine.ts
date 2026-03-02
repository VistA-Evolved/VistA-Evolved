/**
 * Consent Engine — Phase 312
 *
 * Patient consent management following the regulatory profiles defined
 * in country packs. Supports category-level and all-or-nothing consent.
 *
 * Consent records are immutable — once granted/denied, they are never
 * modified. Revocation creates a new record with status "revoked".
 */

import { createHash, randomBytes } from "node:crypto";

// ── Consent Types ──────────────────────────────────────────────

export const CONSENT_CATEGORIES = [
  "treatment",          // Use data for treatment purposes
  "payment",            // Share with payers for billing
  "operations",         // Quality improvement, reporting
  "research",           // De-identified research use
  "data_sharing",       // Share with external providers
  "cross_border",       // Cross-border data transfer
  "telehealth",         // Telehealth session recording (if ever enabled)
  "analytics",          // Aggregated analytics
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentGranularity = "all-or-nothing" | "category" | "item";

export type ConsentStatus = "granted" | "denied" | "revoked" | "expired";

export interface ConsentRecord {
  id: string;
  tenantId: string;
  patientDfn: string;            // VistA DFN (never logged in audit)
  category: ConsentCategory;
  status: ConsentStatus;
  granularity: ConsentGranularity;
  grantedBy: string;             // DUZ of clinician or "patient" for self-service
  grantedAt: string;             // ISO 8601
  expiresAt: string | null;      // null = no expiration
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  evidenceHash: string;          // SHA-256 of consent evidence (form, signature)
  regulatoryBasis: string;       // e.g., "HIPAA 45 CFR 164.508"
  version: number;               // Consent form version
}

export interface ConsentPolicy {
  category: ConsentCategory;
  required: boolean;             // Is consent required before data use?
  defaultStatus: ConsentStatus;  // What happens if patient hasn't responded?
  canRevoke: boolean;            // Can patient revoke this consent?
  minRetentionDays: number;      // How long to keep the consent record
}

// ── Consent Policy by Regulatory Framework ─────────────────────

export interface RegulatoryConsentProfile {
  framework: string;
  granularity: ConsentGranularity;
  policies: ConsentPolicy[];
}

export const HIPAA_CONSENT_PROFILE: RegulatoryConsentProfile = {
  framework: "HIPAA",
  granularity: "category",
  policies: [
    { category: "treatment", required: false, defaultStatus: "granted", canRevoke: false, minRetentionDays: 2555 },
    { category: "payment", required: false, defaultStatus: "granted", canRevoke: false, minRetentionDays: 2555 },
    { category: "operations", required: false, defaultStatus: "granted", canRevoke: false, minRetentionDays: 2555 },
    { category: "research", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "data_sharing", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "cross_border", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "telehealth", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "analytics", required: false, defaultStatus: "granted", canRevoke: true, minRetentionDays: 2555 },
  ],
};

export const DPA_PH_CONSENT_PROFILE: RegulatoryConsentProfile = {
  framework: "DPA_PH",
  granularity: "all-or-nothing",
  policies: [
    { category: "treatment", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "payment", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "operations", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "research", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "data_sharing", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "cross_border", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "telehealth", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
    { category: "analytics", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 1825 },
  ],
};

export const DPA_GH_CONSENT_PROFILE: RegulatoryConsentProfile = {
  framework: "DPA_GH",
  granularity: "all-or-nothing",
  policies: [
    { category: "treatment", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "payment", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "operations", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "research", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "data_sharing", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "cross_border", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "telehealth", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
    { category: "analytics", required: true, defaultStatus: "denied", canRevoke: true, minRetentionDays: 2555 },
  ],
};

const PROFILES: Record<string, RegulatoryConsentProfile> = {
  HIPAA: HIPAA_CONSENT_PROFILE,
  DPA_PH: DPA_PH_CONSENT_PROFILE,
  DPA_GH: DPA_GH_CONSENT_PROFILE,
};

export function getConsentProfile(framework: string): RegulatoryConsentProfile | undefined {
  return PROFILES[framework];
}

/**
 * Phase 494 (W34-P4): Resolve consent profile from a CountryPackValues object.
 * Reads pack.regulatoryProfile.framework and looks up the matching profile.
 * Falls back to HIPAA if framework is not found.
 */
export function getConsentProfileForPack(pack: {
  regulatoryProfile?: { framework?: string; consentGranularity?: string };
}): RegulatoryConsentProfile | undefined {
  const fw = pack?.regulatoryProfile?.framework;
  if (!fw) return PROFILES["HIPAA"];
  return PROFILES[fw] || PROFILES["HIPAA"];
}

export function listConsentProfiles(): string[] {
  return Object.keys(PROFILES);
}

// ── Consent Store (In-Memory — Phase 312 Scaffold) ─────────────

const consentRecords = new Map<string, ConsentRecord>();

export function createConsentRecord(
  input: Omit<ConsentRecord, "id" | "evidenceHash"> & { evidence?: string }
): ConsentRecord {
  const id = `consent-${randomBytes(8).toString("hex")}`;
  const evidenceHash = input.evidence
    ? createHash("sha256").update(input.evidence).digest("hex").slice(0, 16)
    : "no-evidence";

  const record: ConsentRecord = {
    ...input,
    id,
    evidenceHash,
  };

  consentRecords.set(id, record);
  return record;
}

export function getConsentRecords(tenantId: string, patientDfn: string): ConsentRecord[] {
  return [...consentRecords.values()].filter(
    (r) => r.tenantId === tenantId && r.patientDfn === patientDfn
  );
}

export function getActiveConsent(
  tenantId: string,
  patientDfn: string,
  category: ConsentCategory
): ConsentRecord | undefined {
  const records = getConsentRecords(tenantId, patientDfn)
    .filter((r) => r.category === category && r.status === "granted")
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));

  // Check expiration
  const active = records.find((r) => {
    if (!r.expiresAt) return true;
    return new Date(r.expiresAt) > new Date();
  });

  return active;
}

export function revokeConsent(
  consentId: string,
  revokedBy: string,
  reason: string
): ConsentRecord | undefined {
  const existing = consentRecords.get(consentId);
  if (!existing || existing.status !== "granted") return undefined;

  // Create revocation record (original is immutable)
  const revoked: ConsentRecord = {
    ...existing,
    id: `consent-${randomBytes(8).toString("hex")}`,
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revokedBy,
    revocationReason: reason,
  };

  consentRecords.set(revoked.id, revoked);
  // Mark original as revoked
  consentRecords.set(existing.id, { ...existing, status: "revoked", revokedAt: revoked.revokedAt, revokedBy, revocationReason: reason });

  return revoked;
}

/**
 * Check if all required consents are granted for a patient.
 */
export function checkConsentCompliance(
  tenantId: string,
  patientDfn: string,
  profile: RegulatoryConsentProfile
): { compliant: boolean; missing: ConsentCategory[]; granted: ConsentCategory[] } {
  const missing: ConsentCategory[] = [];
  const granted: ConsentCategory[] = [];

  for (const policy of profile.policies) {
    const active = getActiveConsent(tenantId, patientDfn, policy.category);
    if (active) {
      granted.push(policy.category);
    } else if (policy.required && policy.defaultStatus === "denied") {
      missing.push(policy.category);
    } else if (policy.defaultStatus === "granted") {
      granted.push(policy.category);
    }
  }

  return {
    compliant: missing.length === 0,
    missing,
    granted,
  };
}

/**
 * Get store stats for store-policy registration.
 */
export function getConsentStoreStats(): { size: number } {
  return { size: consentRecords.size };
}
