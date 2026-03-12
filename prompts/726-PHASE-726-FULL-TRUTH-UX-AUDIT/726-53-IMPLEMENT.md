# Phase 726-53 Implement - Admin RPC Debug Slice

## Goal

Browser-audit `/cprs/admin/rpc-debug` on the canonical VEHU stack, verify the exact RPC debug panel contract it uses, and fix only evidence-backed truth defects.

## Implementation Steps

1. Reconfirm the canonical API and VistA connectivity before browser work.
2. Inventory the rpc-debug frontend wrapper and the underlying `RpcDebugPanel` contract.
3. Inventory the backend routes the panel calls, including `/vista/rpc-debug/actions`, `/vista/rpc-debug/registry`, and `/vista/rpc-catalog`.
4. Authenticate in the browser as `PRO1234 / PRO1234!!`.
5. Open `/cprs/admin/rpc-debug` and inspect every browser-visible stat, filter, table, and empty-state branch exposed by the page.
6. Corroborate the browser-visible rpc-debug state against the live API routes used by the panel.
7. Capture the same route family unauthenticated and verify the real auth-failure contract.
8. If a real truth defect appears, patch the smallest correct source surface.
9. Re-run the browser proof after any fix on the same canonical stack.
10. Update the Phase 726 browser audit artifact, runtime audit overrides, ops summary, and notion update only after clean live proof.
11. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth`.

## Files Touched

- `apps/web/src/app/cprs/admin/rpc-debug/page.tsx`
- `apps/web/src/components/cprs/panels/RpcDebugPanel.tsx`
- `apps/api/src/server/inline-routes.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `data/ui-estate/runtime-ui-audit-overrides.json`
- `ops/summary.md`
- `ops/notion-update.json`
