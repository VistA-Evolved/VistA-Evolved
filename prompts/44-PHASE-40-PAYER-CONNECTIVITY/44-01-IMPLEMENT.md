# Phase 40 — Payer Connectivity Platform (Adapters + Country Packs + Clearinghouse Slot)

## User Request

Build payer connectivity as a modular, swappable connector system atop Phase 38/39 RCM foundation.

## Implementation Steps

1. Inventory existing code (Phase 38: 28 endpoints, 4 connectors, 15 validation rules, 27 seed payers)
2. Add CLAIM_SUBMISSION_ENABLED safety flag with hard-fail when disabled
3. Add READY_TO_SUBMIT status + file-export connector for safe demo mode
4. Add CSV payer import endpoint + enrollment tracking enhancements
5. Add X12 837P/I scaffold serializer (structured output, not fully compliant)
6. Add PhilHealth eClaims bundle scaffold serializer (versioned v2/v3)
7. Enhance validation with authorization rules + payer-specific rule config
8. Add claim export artifact generation (EDI file export to local folder)
9. Enhance UI with claim detail view, export artifacts, submission safety indicators
10. Documentation: architecture, X12 scaffold, PH scaffold, demo vs prod runbook
11. Update AGENTS.md with Phase 40 gotchas
12. TypeScript compile + verify

## Verification Steps

- verify-phase40-payer-connectivity.ps1 passes all gates
- API starts cleanly with CLAIM_SUBMISSION_ENABLED=false
- Submit attempt returns safe error when disabled
- Export artifacts generated for sandbox connector
- TypeScript compiles with 0 errors

## Files Touched

- apps/api/src/rcm/domain/claim.ts (add READY_TO_SUBMIT status)
- apps/api/src/rcm/domain/claim-store.ts (add export artifact store)
- apps/api/src/rcm/payer-registry/registry.ts (CSV import, enrollment)
- apps/api/src/rcm/connectors/sandbox-connector.ts (file export)
- apps/api/src/rcm/edi/pipeline.ts (export artifact generation)
- apps/api/src/rcm/edi/x12-serializer.ts (NEW: X12 837P/I scaffold)
- apps/api/src/rcm/edi/ph-eclaims-serializer.ts (NEW: PH eClaims bundle)
- apps/api/src/rcm/validation/engine.ts (authorization rules, payer rules)
- apps/api/src/rcm/rcm-routes.ts (new endpoints, safety guards)
- apps/api/src/rcm/audit/rcm-audit.ts (new audit actions)
- apps/web/src/app/cprs/admin/rcm/page.tsx (UI enhancements)
- docs/rcm/payer-connectivity-architecture.md (NEW)
- docs/rcm/us-x12-scaffold.md (NEW)
- docs/rcm/ph-eclaims-scaffold.md (NEW)
- docs/runbooks/rcm-demo-mode-vs-prod.md (NEW)
- AGENTS.md (Phase 40 additions)
- scripts/verify-phase40-payer-connectivity.ps1 (NEW)
