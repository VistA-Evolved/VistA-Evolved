# Phase 726-22 Implement - Payments Slice

## Goal

Browser-audit `/cprs/admin/payments` on the canonical VEHU stack, corroborate the page against the live payments/remittance routes, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API is healthy before browser work.
2. Inventory the payments frontend page and backing payment route files.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/payments` and inspect the live summary cards, filters, tables, drill-ins, and safe action controls.
5. Corroborate browser-visible state against the live routes used by the page.
6. Exercise at least one meaningful low-risk interaction such as filter changes, refresh, or detail drill-in.
7. If a real truth defect appears, patch the smallest correct source surface.
8. Re-run the browser proof after any fix on the same canonical stack.
9. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
10. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/payments/page.tsx`
- `apps/api/src/rcm/**`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`
