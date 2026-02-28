/**
 * Data Residency & Region Routing — Phase 311
 *
 * Tenant-scoped data residency labels with region-aware routing rules.
 * Enforced at the platform layer, not the application layer.
 *
 * See ADR-data-residency-model.md for architecture decision.
 */

// ── Region Labels ──────────────────────────────────────────────

export const DATA_REGIONS = [
  "us-east",   // US East (Virginia)
  "us-west",   // US West (Oregon)
  "ph-mnl",    // Philippines (Manila)
  "gh-acc",    // Ghana (Accra)
  "eu-fra",    // EU (Frankfurt) -- future
  "local",     // On-premise / in-country hosting
] as const;

export type DataRegion = (typeof DATA_REGIONS)[number];

/**
 * Validate that a string is a valid DataRegion.
 */
export function isValidDataRegion(value: string): value is DataRegion {
  return (DATA_REGIONS as readonly string[]).includes(value);
}

// ── Region Metadata ────────────────────────────────────────────

export interface RegionMetadata {
  readonly region: DataRegion;
  readonly displayName: string;
  readonly country: string;         // ISO 3166-1 alpha-2
  readonly status: "active" | "planned" | "deprecated";
  readonly crossBorderAllowed: boolean;
  readonly defaultRetentionYears: number;
}

export const REGION_CATALOG: readonly RegionMetadata[] = [
  {
    region: "us-east",
    displayName: "US East (Virginia)",
    country: "US",
    status: "active",
    crossBorderAllowed: false,
    defaultRetentionYears: 7,
  },
  {
    region: "us-west",
    displayName: "US West (Oregon)",
    country: "US",
    status: "active",
    crossBorderAllowed: false,
    defaultRetentionYears: 7,
  },
  {
    region: "ph-mnl",
    displayName: "Philippines (Manila)",
    country: "PH",
    status: "active",
    crossBorderAllowed: false,
    defaultRetentionYears: 5,
  },
  {
    region: "gh-acc",
    displayName: "Ghana (Accra)",
    country: "GH",
    status: "planned",
    crossBorderAllowed: false,
    defaultRetentionYears: 7,
  },
  {
    region: "eu-fra",
    displayName: "EU (Frankfurt)",
    country: "DE",
    status: "planned",
    crossBorderAllowed: false,
    defaultRetentionYears: 10,
  },
  {
    region: "local",
    displayName: "On-Premise / Local",
    country: "",
    status: "active",
    crossBorderAllowed: false,
    defaultRetentionYears: 7,
  },
];

/**
 * Get metadata for a region.
 */
export function getRegionMetadata(region: DataRegion): RegionMetadata | undefined {
  return REGION_CATALOG.find((r) => r.region === region);
}

// ── Data Transfer Agreement ────────────────────────────────────

export interface DataTransferAgreement {
  id: string;
  tenantId: string;
  sourceRegion: DataRegion;
  targetRegion: DataRegion;
  purpose: string;
  legalBasis: string;
  consentEvidenceRef: string;
  approvedBy: string;
  createdAt: string;      // ISO 8601
  expiresAt: string;      // ISO 8601
  status: "active" | "expired" | "revoked";
}

// ── Tenant Region Assignment ───────────────────────────────────

export interface TenantRegionAssignment {
  tenantId: string;
  dataRegion: DataRegion;
  assignedAt: string;     // ISO 8601
  assignedBy: string;
  immutable: true;        // Always true — cannot be changed after creation
}

// ── Region Routing ─────────────────────────────────────────────

/**
 * Resolve the PG connection string for a tenant's data region.
 *
 * In single-region deployments (dev/test), all tenants use the same
 * PG connection. In multi-region deployments, each region has its
 * own PG cluster identified by env var PLATFORM_PG_URL_{REGION}.
 *
 * @param tenantRegion - The tenant's assigned data region
 * @returns PG connection URL
 * @throws If no PG URL is configured for the region
 */
export function resolveRegionPgUrl(tenantRegion: DataRegion): string {
  // Check for region-specific PG URL first
  const regionKey = tenantRegion.replace("-", "_").toUpperCase();
  const regionUrl = process.env[`PLATFORM_PG_URL_${regionKey}`];
  if (regionUrl) return regionUrl;

  // Fall back to default PG URL (single-region mode)
  const defaultUrl = process.env.PLATFORM_PG_URL;
  if (defaultUrl) return defaultUrl;

  throw new Error(
    `No PG URL configured for region "${tenantRegion}". ` +
    `Set PLATFORM_PG_URL_${regionKey} or PLATFORM_PG_URL.`
  );
}

/**
 * Resolve the S3/MinIO bucket for a tenant's audit shipping.
 *
 * Format: audit-{region} (e.g., "audit-us-east", "audit-ph-mnl")
 */
export function resolveRegionAuditBucket(tenantRegion: DataRegion): string {
  const regionBucket = process.env[
    `AUDIT_SHIP_BUCKET_${tenantRegion.replace("-", "_").toUpperCase()}`
  ];
  if (regionBucket) return regionBucket;

  // Fall back to default bucket with region suffix
  const baseBucket = process.env.AUDIT_SHIP_BUCKET || "audit";
  return `${baseBucket}-${tenantRegion}`;
}

// ── Cross-Border Transfer Validation ───────────────────────────

export interface TransferValidationResult {
  allowed: boolean;
  reason: string;
  requiresConsent: boolean;
  requiresAgreement: boolean;
}

/**
 * Validate whether a cross-border data transfer is allowed.
 */
export function validateCrossBorderTransfer(
  sourceRegion: DataRegion,
  targetRegion: DataRegion,
  hasConsent: boolean,
  hasAgreement: boolean
): TransferValidationResult {
  // Same region — always allowed
  if (sourceRegion === targetRegion) {
    return {
      allowed: true,
      reason: "Same region - no transfer needed",
      requiresConsent: false,
      requiresAgreement: false,
    };
  }

  const sourceMeta = getRegionMetadata(sourceRegion);
  const targetMeta = getRegionMetadata(targetRegion);

  if (!sourceMeta || !targetMeta) {
    return {
      allowed: false,
      reason: `Unknown region: ${!sourceMeta ? sourceRegion : targetRegion}`,
      requiresConsent: false,
      requiresAgreement: false,
    };
  }

  // Same country — allowed if cross-border is enabled
  if (sourceMeta.country === targetMeta.country) {
    return {
      allowed: true,
      reason: `Same country (${sourceMeta.country}) - intra-country transfer`,
      requiresConsent: false,
      requiresAgreement: false,
    };
  }

  // Cross-country — requires consent + agreement
  if (!sourceMeta.crossBorderAllowed) {
    return {
      allowed: false,
      reason: `Cross-border transfer blocked from ${sourceRegion}`,
      requiresConsent: true,
      requiresAgreement: true,
    };
  }

  if (!hasConsent) {
    return {
      allowed: false,
      reason: "Patient consent required for cross-border transfer",
      requiresConsent: true,
      requiresAgreement: true,
    };
  }

  if (!hasAgreement) {
    return {
      allowed: false,
      reason: "Data Transfer Agreement required",
      requiresConsent: false,
      requiresAgreement: true,
    };
  }

  return {
    allowed: true,
    reason: "Cross-border transfer allowed with consent and agreement",
    requiresConsent: false,
    requiresAgreement: false,
  };
}

// ── Region Health ──────────────────────────────────────────────

export interface RegionHealth {
  region: DataRegion;
  pgConnected: boolean;
  auditBucketAccessible: boolean;
  lastChecked: string;
}
