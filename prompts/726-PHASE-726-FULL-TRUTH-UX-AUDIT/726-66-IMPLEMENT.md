# Phase 726-66 IMPLEMENT - Verify Page Slice

## User request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist.

## Slice target

- Route: `/cprs/verify`
- Surface: CPRS verification page

## Inventory

- Frontend page: `apps/web/src/app/cprs/verify/page.tsx`
- Related client dependencies:
  - `apps/web/src/stores/session-context.tsx`
  - `apps/web/src/lib/contracts/loader.ts`
  - multiple `/vista/*` read endpoints plus `/health` and `/vista/ping`

## Implementation steps

1. Browser-prove authenticated and unauthenticated behavior for `/cprs/verify`.
2. Verify whether the page truthfully reports the live route and contract-check state on the canonical stack.
3. Patch only if the surface has real truth defects, fail-open auth behavior, or browser-facing UI issues.
4. Re-run browser proof after any patch.
5. Record the slice in the Phase 726 artifacts and regenerate runtime/truth outputs.

## Verification steps

1. Confirm unauthenticated access redirects to login.
2. Confirm authenticated access runs the verification checks and reports the real pass/fail state.
3. Confirm any visible labels or detail text are browser-safe and truthful.
4. Run:
   - `pnpm audit:ui-estate:runtime`
   - `pnpm audit:ui-estate:truth`