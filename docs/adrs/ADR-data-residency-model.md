# ADR: Data Residency Model

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Wave 13 Phase 309 (Regulatory/Compliance + Multi-Country Packaging)

## Decision

**Implement tenant-scoped data residency labels with region-aware routing
rules** — enforced at the platform layer, not the application layer.

## Context

Different countries impose data residency requirements:

- **US (HIPAA):** No explicit residency mandate, but BAA/HITECH requires
  safeguards. Many orgs prefer US-only hosting.
- **Philippines (DPA 2012):** National Privacy Commission requires consent
  for cross-border data transfer. No strict residency.
- **Ghana (DPA 2012):** Data Protection Commission requires that personal
  data processed in Ghana be stored within the country or in a country
  with adequate protections.
- **EU (GDPR):** Strict residency + adequacy decisions. (Future market.)

### Options Considered

1. **Single-region, separate deployments** — one VistA-Evolved cluster per country
2. **Multi-region, region-routed** — single codebase, data partitioned by region label
3. **Client-side encryption with any-region storage** — encrypt at source, store anywhere

## Rationale

| Criterion              |  Separate deploy  |      Region-routed       | Client-encrypt |
| ---------------------- | :---------------: | :----------------------: | :------------: |
| Operational complexity | High (N clusters) | Medium (1 control plane) |      Low       |
| Regulatory alignment   |       Best        |           Good           |   Uncertain    |
| Data sovereignty proof |      Trivial      |      Requires audit      | Hard to prove  |
| Cost efficiency        |       Worst       |           Good           |      Best      |
| Feature parity         | Hard to maintain  |        Guaranteed        |   Guaranteed   |

- **Hybrid approach:** Region-routed by default, with separate-deploy override
  for high-assurance markets.
- Phase 125 already enforces `PLATFORM_RUNTIME_MODE` and PG requirements.
- Phase 153 adds `tenant_oidc_mapping` per-tenant.
- The data plane already supports tenant isolation via RLS (Phase 125/153).

## Architecture

### Region Labels

Each tenant has a `dataRegion` property:

```typescript
type DataRegion =
  | 'us-east' // US East (Virginia)
  | 'us-west' // US West (Oregon)
  | 'ph-mnl' // Philippines (Manila)
  | 'gh-acc' // Ghana (Accra)
  | 'eu-fra' // EU (Frankfurt) — future
  | 'local'; // On-premise / in-country hosting
```

### Enforcement Points

1. **Tenant creation:** `dataRegion` is set from the country pack and cannot
   be changed after creation (immutable).
2. **PG connection routing:** `store-resolver.ts` selects the PG connection
   string based on `dataRegion`. Each region has its own PG cluster.
3. **Object storage routing:** Audit shipping (Phase 157) S3 bucket is
   region-scoped. Tenant's audit goes to `audit-{region}` bucket.
4. **Backup routing:** `backup-restore.mjs` targets region-specific storage.
5. **Cross-region transfer:** Blocked by default. Requires explicit
   `DataTransferAgreement` record with consent evidence.

### Data Transfer Controls

```typescript
interface DataTransferAgreement {
  id: string;
  tenantId: string;
  sourceRegion: DataRegion;
  targetRegion: DataRegion;
  purpose: string; // Why data is being transferred
  legalBasis: string; // Regulatory justification
  consentEvidenceRef: string; // Link to consent record
  approvedBy: string; // Admin who approved
  expiresAt: string; // ISO 8601
  status: 'active' | 'expired' | 'revoked';
}
```

### Country Pack Integration

The country pack `values.json` includes:

```jsonc
{
  "dataResidency": {
    "region": "us-east",
    "crossBorderTransferAllowed": false,
    "requiresConsentForTransfer": true,
    "retentionMinYears": 7,
  },
}
```

## Consequences

- Tenant provisioning requires `dataRegion` (immutable after creation).
- PG connection pool becomes region-aware.
- Audit shipping partitions by region.
- Cross-region analytics requires data transfer agreement workflow.
- Separate-deploy mode for high-assurance markets (e.g., Ghana gov) uses
  the same codebase with a single-region config.
- No data leaves a region without explicit agreement + audit trail.

## Not In Scope (Yet)

- Encryption-at-rest key management per region (deferred to infra layer).
- Real-time replication between regions (not needed for initial markets).
- GDPR-specific features (right to erasure, portability) — future wave.

## Related

- Phase 125: Runtime mode, PG requirements, store resolver
- Phase 150: Portal session security, OIDC mandate
- Phase 153: Tenant OIDC mapping, data plane posture
- Phase 157: Audit shipping with S3
- ADR-country-pack-model.md
- ADR-terminology-model.md
