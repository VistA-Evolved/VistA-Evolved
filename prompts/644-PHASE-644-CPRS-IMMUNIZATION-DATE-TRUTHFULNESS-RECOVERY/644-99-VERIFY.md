# Phase 644 - CPRS Immunization Date Truthfulness Recovery - Verify

## Verification Steps
- Confirm Docker/API/VistA remain healthy before and after the change.
- Call GET /vista/immunizations?dfn=84 with clinician session cookies.
- Verify response still returns ok:true with real ORQQPX IMMUN LIST data.
- Verify dateTime is now clinician-readable instead of raw FileMan format.
- Verify rawDateTime preserves the original VistA value for traceability.
- Open /cprs/chart/84/immunizations in the browser.
- Confirm the left table shows readable dates for HEP B and INFLUENZA.
- Confirm the right detail pane shows the readable date and no longer exposes the inverse date artifact.

## Acceptance Criteria
- The API remains VistA-first and still calls ORQQPX IMMUN LIST.
- Real VEHU immunization history is visible for a populated patient.
- Clinicians no longer see raw FileMan dates in the Immunizations tab.
- The panel does not expose the inverse date key as clinician-facing content.
- Empty-state patients such as DFN 46 still show a truthful empty state.

## Files Touched
- apps/api/src/routes/immunizations/index.ts
- apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx
- prompts/644-PHASE-644-CPRS-IMMUNIZATION-DATE-TRUTHFULNESS-RECOVERY/644-01-IMPLEMENT.md
- prompts/644-PHASE-644-CPRS-IMMUNIZATION-DATE-TRUTHFULNESS-RECOVERY/644-99-VERIFY.md