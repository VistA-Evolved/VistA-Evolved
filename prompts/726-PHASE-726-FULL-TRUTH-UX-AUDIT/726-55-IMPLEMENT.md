# Phase 726-55 Implement - Admin Service Lines Slice

## Goal

Browser-audit `/cprs/admin/service-lines` on the canonical VEHU stack, verify the exact ED, OR, and ICU dashboard contracts it uses, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API and VistA connectivity before browser work.
2. Inventory the service-lines frontend page and the backend routes it calls.
3. Confirm the live contracts for `/ed/board`, `/or/board`, and `/icu/metrics`, including whether they are session-protected or local-store only.
4. Authenticate in the browser as `PRO1234 / PRO1234!!`.
5. Open `/cprs/admin/service-lines` and inspect every browser-visible tab, card, metric, and empty-state branch.
6. Corroborate the browser-visible service-line state against the live API routes used by the page.
7. Capture the same route family unauthenticated and verify the real auth-failure contract.
8. If a real truth defect appears, patch the smallest correct source surface.
9. Re-run the browser proof after any fix on the same canonical stack.
10. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
11. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/service-lines/page.tsx`
- `apps/api/src/service-lines/ed/ed-routes.ts`
- `apps/api/src/service-lines/or/or-routes.ts`
- `apps/api/src/service-lines/icu/icu-routes.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`
