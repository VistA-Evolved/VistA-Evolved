# Phase 264 -- Data Portability Exports v1 (IMPLEMENT)

## Summary
Add FHIR bulk-ish export, patient chart FHIR bundles, and tenant data export
with SHA-256 manifest integrity verification.

## Inventory (files inspected)
- apps/api/src/exports/export-engine.ts (Phase 245 -- existing CSV/JSON/NDJSON engine)
- apps/api/src/exports/export-formats.ts (Phase 245 -- format helpers)
- apps/api/src/fhir/types.ts (Phase 178 -- FHIR R4 resource types)
- apps/api/src/fhir/fhir-routes.ts (Phase 178 -- FHIR R4 read endpoints)
- apps/api/src/routes/record-portability-routes.ts (Phase 80 -- encrypted artifacts)
- apps/api/src/exports/export-v2-routes.ts (Phase 245 -- export v2 routes)
- apps/api/src/platform/store-policy.ts (in-memory store registry)

## Files Created
1. apps/api/src/exports/data-portability.ts -- FHIR bulk export engine, patient chart bundles, tenant data export, manifest verification
2. apps/api/src/routes/data-portability-routes.ts -- 12 admin endpoints
3. apps/api/tests/data-portability.test.ts -- unit tests

## Existing Files Preserved (NOT modified)
- export-engine.ts (Phase 245 v2 export engine)
- export-formats.ts
- fhir/types.ts
- record-portability-routes.ts (Phase 80)

## Key Decisions
- FHIR $export follows the Bulk Data Access IG pattern (kickoff -> poll -> download)
- SHA-256 content hashing per output file for manifest verification
- Patient chart export wraps VistA RPC data into FHIR R4 Document Bundles
- Tenant data export covers 7 scopes: clinical, rcm, audit, analytics, platform, imaging, integrations
- In-memory job stores (consistent with existing Phase 245 pattern)
- All routes under /admin/exports/* -- admin-only via AUTH_RULES
