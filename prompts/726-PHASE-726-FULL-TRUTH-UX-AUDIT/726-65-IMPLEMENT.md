# Phase 726-65 IMPLEMENT - Preferences Slice

## User request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist.

## Slice target

- Route: `/cprs/settings/preferences`
- Surface: CPRS preferences page

## Inventory

- Frontend page: `apps/web/src/app/cprs/settings/preferences/page.tsx`
- Related client dependencies:
  - `apps/web/src/stores/cprs-ui-state.tsx`
  - `apps/web/src/stores/session-context.tsx`
  - `apps/web/src/stores/tenant-context.tsx`

## Implementation steps

1. Browser-prove authenticated and unauthenticated behavior for `/cprs/settings/preferences`.
2. Verify whether the route truthfully behaves as a protected local preferences surface.
3. Patch only if the page fails open under unauthenticated access or misrepresents tenant-backed defaults.
4. Re-run browser proof after any patch.
5. Record the slice in the Phase 726 artifacts and regenerate runtime/truth outputs.

## Verification steps

1. Confirm unauthenticated access redirects to login instead of rendering the preferences shell.
2. Confirm authenticated access renders the local preference controls truthfully.
3. Confirm facility-default reset behavior remains non-deceptive on the current stack.
4. Run:
   - `pnpm audit:ui-estate:runtime`
   - `pnpm audit:ui-estate:truth`