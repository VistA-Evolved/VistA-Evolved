# Phase 726-20 Implement - Claims Workbench Slice

## Goal

Browser-audit `/cprs/admin/claims-workbench` on the canonical VEHU stack, corroborate the page against the live HMO claims workflow routes, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API is healthy before browser work.
2. Inventory the claims-workbench frontend page and backing HMO claims workflow route files.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/claims-workbench` and inspect the live board metrics, work queues, detail panes, and safe action controls.
5. Corroborate browser-visible state against the live `/rcm/claims/hmo*` routes used by the page.
6. Exercise at least one meaningful low-risk interaction such as filter changes, board refresh, or opening an existing claim detail if truthful data exists.
7. If a real truth defect appears, patch the smallest correct source surface.
8. Re-run the browser proof after any fix on the same canonical stack.
9. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
10. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/claims-workbench/page.tsx`
- `apps/api/src/rcm/workflows/claims-workflow-routes.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`
