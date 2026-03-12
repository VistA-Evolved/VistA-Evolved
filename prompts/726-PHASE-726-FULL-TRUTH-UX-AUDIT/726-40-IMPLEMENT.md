# Phase 726-40 Implement - HMO Portal Slice

## Goal

Browser-audit `/cprs/admin/hmo-portal` on the canonical VEHU stack, corroborate the page against the live HMO portal routes it actually uses, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API and VistA connectivity before browser work.
2. Inventory the HMO portal frontend page and the exact backend route files it calls.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/hmo-portal` and inspect every live route-backed section or tab.
5. Corroborate browser-visible state against the live API routes used by the page.
6. Exercise at least one meaningful low-risk interaction only if the live state justifies it.
7. If a real truth defect appears, patch the smallest correct source surface.
8. Re-run the browser proof after any fix on the same canonical stack.
9. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
10. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/hmo-portal/page.tsx`
- `apps/api/src/routes/**`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`