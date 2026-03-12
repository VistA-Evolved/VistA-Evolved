# Phase 726-52 Implement - Admin Reports Slice

## Goal

Browser-audit `/cprs/admin/reports` on the canonical VEHU stack, verify the exact admin reporting dashboard contract it uses, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API and VistA connectivity before browser work.
2. Inventory the admin reports frontend page and the backend routes it calls.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/reports` and inspect every browser-visible tab, table, card, and export surface exposed by the page.
5. Corroborate the browser-visible reports state against the live API routes used by the page.
6. If a real truth defect appears, patch the smallest correct source surface.
7. Re-run the browser proof after any fix on the same canonical stack.
8. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
9. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/reports/page.tsx`
- `apps/api/src/routes/reporting.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`