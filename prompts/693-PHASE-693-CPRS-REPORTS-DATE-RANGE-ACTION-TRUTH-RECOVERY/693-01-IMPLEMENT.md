# Phase 693 - CPRS Reports Date-Range Action Truth Recovery

## User Request
- Continue the live clinician audit until the CPRS/web experience is truthful, production-grade, and VistA-first.
- Fix real user-visible defects instead of speculative gaps.

## Implementation Steps
1. Inventory the Reports panel date-range workflow and confirm the current custom loader contract.
2. Verify live that the Load Custom Range button is enabled when the start and end dates are blank.
3. Confirm the handler blocks and only reports missing dates after the click.
4. Patch the button gating so the action is disabled until both dates are provided.
5. Preserve the existing submit-time validation as a defensive fallback.
6. Keep the change minimal and limited to action truthfulness.
7. Update runbook and ops artifacts to record the Reports date-range contract.
8. Re-verify in the browser and run frontend compile validation.

## Files Touched
- apps/web/src/components/cprs/panels/ReportsPanel.tsx
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes
- Live page: /cprs/chart/46/reports
- Live defect proof: selecting a date-range report and choosing Date Range... exposed an enabled Load Custom Range button while both dates were blank.
- Relevant report used for proof: Lab Status.
