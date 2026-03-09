# Phase 656 - CPRS Patient Banner Context Recovery Verify

## Verification Steps

1. Open `http://127.0.0.1:3000/cprs/chart/46/reports` in an authenticated browser session.
2. Confirm the browser can fetch `/vista/patient-demographics?dfn=46` successfully.
3. Verify the patient banner shows the live patient name, DOB, sex, and DFN instead of an indefinite loading message.
4. Verify the Reports panel still loads the live report catalog and report text.

## Acceptance Criteria

- Same-DFN chart loads recover missing patient demographics without requiring a patient-search round trip.
- The patient banner no longer shows a false infinite loading state when demographics fetch fails.
- The Reports workflow remains live and truthful after the patient-context fix.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/stores/patient-context.tsx
- apps/web/src/components/cprs/PatientBanner.tsx
