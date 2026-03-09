# Phase 692 - CPRS Imaging Order Action Truth Recovery Verify

## Verification Steps
1. Open /cprs/chart/46/imaging as an authenticated clinician.
2. Switch to the New Order subtab.
3. Confirm Create Order is disabled when Procedure and Clinical Indication are blank.
4. Enter only Procedure and confirm Create Order remains disabled.
5. Enter both required fields and confirm Create Order becomes enabled.
6. Click Create Order only after the form is valid and confirm normal submit behavior remains intact.
7. Run pnpm -C apps/web exec tsc --noEmit.
8. Check editor diagnostics for ImagingPanel.tsx.

## Acceptance Criteria
- The UI does not advertise a clickable Create Order action when the form is invalid.
- The user can still create an imaging order once required fields are filled.
- Existing submit-time error guards remain in place.
- Documentation and ops artifacts reflect the new Imaging truth contract.
- Frontend compile passes with no introduced errors.

## Evidence
- Live page: /cprs/chart/46/imaging
- Route grounding: POST /imaging/worklist/orders
- Patient used for audit: DFN 46
