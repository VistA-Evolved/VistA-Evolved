# Phase 726-64 IMPLEMENT - Remote Data Viewer Slice

## User request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist.

## Slice target

- Route: `/cprs/remote-data-viewer`
- Surface: Remote Data Viewer page

## Inventory

- Frontend page: `apps/web/src/app/cprs/remote-data-viewer/page.tsx`
- Related client dependencies:
  - `apps/web/src/stores/patient-context.tsx`
  - `apps/web/src/components/cprs/CPRSMenuBar.tsx`
  - `apps/web/src/components/cprs/PatientBanner.tsx`
- Backing routes to corroborate:
  - `GET /vista/remote-facilities`
  - `GET /vista/remote-data`
  - `GET /admin/registry/default`

## Implementation steps

1. Corroborate authenticated and unauthenticated behavior of the backing routes.
2. Browser-prove `/cprs/remote-data-viewer` in authenticated and unauthenticated contexts.
3. Verify whether the page truthfully distinguishes protected auth failures, remote-source absence, and integration-pending CIRN/FHIR posture.
4. Patch only if the page collapses auth/load failures into fake empty-state or actionable-looking UI.
5. Re-run browser proof after any patch.
6. Record the slice in the Phase 726 audit artifacts and regenerate runtime/truth outputs.

## Verification steps

1. Confirm unauthenticated access does not present a fake loaded remote-data workspace.
2. Confirm authenticated access reflects the real route posture for remote facilities and integration-registry sources.
3. Confirm query actions only describe integration-pending or unavailable posture when that is what the live backend actually returns.
4. Run:
   - `pnpm audit:ui-estate:runtime`
   - `pnpm audit:ui-estate:truth`