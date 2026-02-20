# Phase 44 — Global Payer Directory Engine + Jurisdiction Packs

## User Request
Implement payer directory importers and jurisdiction packs that pull from authoritative sources. Payers are data; connectors are adapters. Make it impossible to forget payers.

## Implementation Steps
1. Create `apps/api/src/rcm/payerDirectory/` module:
   - `types.ts` (DirectoryPayer canonical schema, ImporterInterface, DiffResult, EnrollmentPacket)
   - `normalization.ts` (raw -> normalized pipeline + diff engine)
   - `routing.ts` (jurisdiction + payer + connector -> route selection)
2. Authoritative importers:
   - `importers/ph-insurance-commission.ts` (PH HMO list from IC snapshot)
   - `importers/au-apra.ts` (AU private health insurers from APRA snapshot)
   - `importers/us-clearinghouse.ts` (US clearinghouse/Availity/OfficeAlly file drops)
   - `importers/sg-nz-gateways.ts` (SG NPHC + NZ ACC national gateways)
3. Reference source snapshots: `/reference/payer-sources/{philippines,australia}/`
4. Enrollment model + endpoints on rcm-routes.ts
5. Routing rules engine with ROUTE_NOT_FOUND typed error
6. UI: Add "Payer Directory" tab on RCM page
7. Docs: payer-directory.md, jurisdiction-packs.md, runbooks
8. Tests: vitest suite for importers + routing + enrollment 
9. Prompts folder audit

## Verification Steps
- `npx tsc --noEmit` clean
- `npx vitest run tests/payer-directory.test.ts` all pass
- API starts, endpoints respond
- All importers produce valid payer lists
- Routing resolves known combos, returns ROUTE_NOT_FOUND for unknown

## Files Touched
- apps/api/src/rcm/payerDirectory/types.ts (NEW)
- apps/api/src/rcm/payerDirectory/normalization.ts (NEW)
- apps/api/src/rcm/payerDirectory/routing.ts (NEW)
- apps/api/src/rcm/payerDirectory/importers/ph-insurance-commission.ts (NEW)
- apps/api/src/rcm/payerDirectory/importers/au-apra.ts (NEW)
- apps/api/src/rcm/payerDirectory/importers/us-clearinghouse.ts (NEW)
- apps/api/src/rcm/payerDirectory/importers/sg-nz-gateways.ts (NEW)
- apps/api/src/rcm/payerDirectory/importers/index.ts (NEW)
- apps/api/src/rcm/rcm-routes.ts (MODIFIED — new directory/enrollment/routing routes)
- apps/api/src/rcm/audit/rcm-audit.ts (MODIFIED — new audit actions)
- apps/web/src/app/cprs/admin/rcm/page.tsx (MODIFIED — Payer Directory tab)
- apps/api/tests/payer-directory.test.ts (NEW)
- reference/payer-sources/philippines/ic-hmo-list.json (NEW)
- reference/payer-sources/australia/apra-insurers.json (NEW)
- docs/rcm/payer-directory.md (NEW)
- docs/rcm/jurisdiction-packs.md (NEW)
- docs/runbooks/payer-directory-refresh.md (NEW)
- docs/runbooks/enrollment-packets.md (NEW)
- scripts/verify-latest.ps1 (MODIFIED)
