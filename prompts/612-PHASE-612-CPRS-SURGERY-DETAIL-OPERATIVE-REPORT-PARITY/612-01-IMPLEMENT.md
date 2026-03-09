# Phase 612 - CPRS Surgery Detail + Operative Report Parity (IMPLEMENT)

## User Request

Continue closing AI-left CPRS parity gaps so the full UI works truthfully for the user with VistA-first behavior. The Surgery tab must stop advertising an indefinite operative-report integration gap when native CPRS already retrieves linked surgery detail and TIU report text.

## Implementation Steps

1. Inventory the current Surgery panel, the Phase 12/124 prompt lineage, and the original CPRS surgery implementation in `reference/cprs/Packages/Order Entry Results Reporting/CPRS/CPRS-Chart/rSurgery.pas` and `fSurgery.pas`.
2. Confirm the live surgery list contract from `GET /vista/surgery?dfn=46` and identify what the current web panel is missing versus CPRS: selected-case detail, linked report resolution, report text, and detailed display.
3. Extend `apps/api/src/server/inline-routes.ts` so the surgery surface follows the CPRS path: `ORWSR LIST` for the case list, `ORWSR ONECASE` for selected-case detail/doc linkage, and `TIU GET RECORD TEXT` plus `TIU DETAILED DISPLAY` for operative note rendering.
4. Fix any incorrect truthfulness metadata in `apps/web/src/stores/data-cache.tsx` so pending banners and fallback targets name the actual surgery RPC in use.
5. Upgrade `apps/web/src/components/cprs/panels/SurgeryPanel.tsx` so selecting a case loads real VistA-backed case detail and operative note content instead of a permanent integration-pending banner.
6. Keep the implementation minimal and grounded. Do not invent synthetic surgery reports or fake document linkages.
7. Update the surgery parity/runbook docs plus ops artifacts after live verification passes.

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy before editing.
2. Confirm the API is healthy and VistA reachable before live-testing the surgery changes.
3. Validate the touched web/api code with TypeScript or diagnostics.
4. Login with the VEHU clinician account and call `GET /vista/surgery?dfn=46`.
5. Call the new surgery detail route for a real returned case id and confirm it returns `ok:true` plus grounded `rpcUsed` entries.
6. Verify that operative text or detailed display is returned from TIU when a linked note exists, without falling back to fake placeholder content.
7. Run `scripts/verify-latest.ps1` and only then update ops artifacts to Phase 612.

## Files Touched

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`
- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `docs/parity-coverage-report.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/612-PHASE-612-CPRS-SURGERY-DETAIL-OPERATIVE-REPORT-PARITY/612-01-IMPLEMENT.md`
- `prompts/612-PHASE-612-CPRS-SURGERY-DETAIL-OPERATIVE-REPORT-PARITY/612-99-VERIFY.md`