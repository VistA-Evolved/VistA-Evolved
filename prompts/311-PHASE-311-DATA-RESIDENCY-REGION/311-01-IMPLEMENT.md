# Phase 311 — IMPLEMENT: Data Residency & Region Routing

> Wave 13-P3 (Regulatory/Compliance + Multi-Country Packaging)

## Objective

Implement tenant-scoped data residency labels with region-aware routing rules,
cross-border transfer validation, and transfer agreement management.

## Deliverables

### 1. Data Residency Module

- **File:** `apps/api/src/platform/data-residency.ts`
- `DataRegion` type (6 regions: us-east, us-west, ph-mnl, gh-acc, eu-fra, local)
- `REGION_CATALOG` metadata (display name, country, status, cross-border rules)
- `resolveRegionPgUrl()` — region-aware PG connection routing
- `resolveRegionAuditBucket()` — region-aware S3 bucket resolution
- `validateCrossBorderTransfer()` — transfer validation with consent/agreement checks
- `DataTransferAgreement` interface for cross-border data movement

### 2. Data Residency Routes

- **File:** `apps/api/src/routes/data-residency-routes.ts`
- `GET /residency/regions` — list all data regions with status
- `GET /residency/regions/:region` — region details
- `GET /residency/tenant/:tenantId` — tenant region assignment
- `POST /residency/tenant/:tenantId/assign` — one-time region assignment (immutable)
- `POST /residency/transfer-agreements` — create transfer agreement
- `GET /residency/transfer-agreements` — list agreements
- `POST /residency/validate-transfer` — check if transfer is allowed

## Acceptance Criteria

- [ ] DataRegion type covers 6 regions
- [ ] Region assignment is immutable after creation
- [ ] Cross-border transfer requires consent + agreement
- [ ] Same-region transfers always allowed
- [ ] PG URL resolution supports per-region env vars
- [ ] Audit bucket resolution is region-scoped

## Dependencies

- ADR-data-residency-model.md (Phase 309)
- Phase 125: Runtime mode, store resolver
- Phase 157: Audit shipping
