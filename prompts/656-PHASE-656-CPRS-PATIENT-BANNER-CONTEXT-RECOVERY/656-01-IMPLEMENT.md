# Phase 656 - CPRS Patient Banner Context Recovery

## User Request

- Continue autonomous CPRS chart recovery work.
- Keep the chart truthful from the clinician's real browser perspective.
- Use VistA-backed routes and existing prompt lineage before changing chart behavior.

## Implementation Steps

1. Reproduce the chart state where a live report loads but the patient banner remains stuck on `Loading patient ...`.
2. Confirm `/vista/patient-demographics` is healthy from the authenticated browser before changing frontend code.
3. Fix chart-route patient re-selection so same-DFN chart loads can repopulate missing demographics after session or provider-context churn.
4. Make the patient context store remember demographics fetch failures instead of leaving the banner in a false loading state forever.
5. Update the patient banner so it distinguishes loading from an actual demographics load failure.
6. Re-verify the Reports chart route in the browser and confirm the banner shows the real patient demographics once context recovers.

## Verification Steps

1. Verify `GET /vista/patient-demographics?dfn=46` returns live VistA demographics in an authenticated browser session.
2. Reload the Reports chart and confirm the patient banner renders demographics instead of `Loading patient 46...`.
3. Confirm the Reports panel still loads and renders live report content after the patient-context recovery.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/stores/patient-context.tsx
- apps/web/src/components/cprs/PatientBanner.tsx
