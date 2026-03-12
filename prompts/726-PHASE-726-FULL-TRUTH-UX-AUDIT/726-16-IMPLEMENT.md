# Phase 726-16 Implement - Branding Slice

## Goal

Browser-audit `/cprs/admin/branding` on the canonical VEHU stack, corroborate the page against the live branding and UI-defaults routes, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API is healthy before browser work.
2. Inventory the branding frontend page and backing admin route/config files.
3. Authenticate in the browser as `PRO1234 / PRO1234!!`.
4. Open `/cprs/admin/branding` and inspect the visible branding, theme, and preview tabs.
5. Corroborate browser-visible state against the live `/admin/branding/:tenantId` and `/admin/ui-defaults/:tenantId` routes used by the page.
6. Exercise at least one meaningful low-risk interaction such as tab switching or a truthful save/reset path if the payload is safe.
7. If a real truth defect appears, patch the smallest correct source surface.
8. Re-run the browser proof after any fix on the same canonical stack.
9. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
10. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/branding/page.tsx`
- `apps/api/src/routes/admin.ts`
- `apps/api/src/config/tenant-config.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`