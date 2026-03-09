# Phase 692 - CPRS Imaging Order Action Truth Recovery

## User Request
- Continue the live clinician audit until the CPRS/web experience is truthful, production-grade, and VistA-first.
- Fix real user-visible defects rather than speculative gaps.

## Implementation Steps
1. Inventory the Imaging panel New Order workflow in the chart UI and confirm the current action contract.
2. Verify live that the Create Order button is enabled when required fields are blank.
3. Confirm the handler in ImagingOrderForm rejects blank scheduledProcedure or clinicalIndication after click.
4. Patch the button gating so the action is disabled until all required fields are present.
5. Keep the existing submit-time validation as a defensive backend-facing guard.
6. Preserve current styling and only adjust affordance truthfulness.
7. Update runbook and ops artifacts to record the Imaging action truth contract.
8. Re-verify in the browser and run frontend compile validation.

## Files Touched
- apps/web/src/components/cprs/panels/ImagingPanel.tsx
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes
- Live page: /cprs/chart/46/imaging
- Live defect proof: New Order form showed enabled Create Order with blank required fields.
- Route involved: POST /imaging/worklist/orders
