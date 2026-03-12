# Phase 726-09 Implement - Audit Viewer Slice

## Goal

Browser-audit `/cprs/admin/audit-viewer` on the canonical VEHU stack, corroborate each visible tab against the live immutable-audit API routes, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical stack is healthy before browser work.
2. Inventory the frontend page and the backing immutable-audit route family.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/audit-viewer` and inspect all visible tabs and controls.
5. Corroborate browser state against live API responses for events, stats, chain verification, and any policy/config tab data.
6. If a real truth defect appears, patch the smallest correct source surface.
7. Re-run the browser proof after the fix on the same canonical stack.
8. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
9. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/audit-viewer/page.tsx`
- `apps/api/src/routes/iam-routes.ts`
- `apps/api/src/lib/immutable-audit.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`