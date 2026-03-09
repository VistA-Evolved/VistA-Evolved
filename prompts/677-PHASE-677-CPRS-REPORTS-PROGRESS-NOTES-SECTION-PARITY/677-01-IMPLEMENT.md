# Phase 677 - CPRS Reports Progress Notes Section Parity

## Goal

Recover a clinician-visible Reports tree defect where the live `Progress Notes` report is grouped under `Graphing (local only)` instead of the dedicated `Progress Notes` section in the CPRS-style report browser.

## Problem Statement

Live VEHU verification for `GET /vista/reports?dfn=46` shows the raw `ORWRP REPORT LISTS` payload contains both:
- `OR_PN^Progress Notes^6...` as a real report row
- `OR_PNMN^Progress Notes...` as a later section heading

The current parser in `apps/api/src/server/inline-routes.ts` assigns each report to the most recently seen heading. Because `OR_PN` arrives before `OR_PNMN`, the Reports UI groups Progress Notes under `Graphing (local only)`, which is not CPRS-parity behavior and is misleading to clinicians.

## Implementation Steps

1. Inventory the existing Reports catalog parser and prompt lineage:
- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-01-IMPLEMENT.md`
- `prompts/642-PHASE-642-CPRS-REPORTS-LOCAL-ONLY-TRUTHFULNESS-RECOVERY/642-01-IMPLEMENT.md`

2. Confirm the live defect against VEHU:
- `GET /vista/reports?dfn=46` must show `OR_PN` in the returned report rows and `OR_PNMN` in the sections/raw headings.
- The browser Reports panel must show `Progress Notes` grouped under `Graphing (local only)` before the fix.

3. Correct the reports catalog parser in `apps/api/src/server/inline-routes.ts`.
- Keep the parser VistA-first and minimal.
- Preserve the raw report list for debugging.
- Add explicit grouping recovery so `OR_PN` resolves to the `Progress Notes` section instead of inheriting `OR_GRAPHS`.

4. Verify whether any UI change is still necessary after the API fix.
- Prefer fixing the source catalog mapping over adding frontend special cases.

5. Update runbook and ops artifacts after live verification succeeds.

## Files Touched

- `prompts/677-PHASE-677-CPRS-REPORTS-PROGRESS-NOTES-SECTION-PARITY/677-01-IMPLEMENT.md`
- `prompts/677-PHASE-677-CPRS-REPORTS-PROGRESS-NOTES-SECTION-PARITY/677-99-VERIFY.md`
- `apps/api/src/server/inline-routes.ts`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `ops/summary.md`
- `ops/notion-update.json`