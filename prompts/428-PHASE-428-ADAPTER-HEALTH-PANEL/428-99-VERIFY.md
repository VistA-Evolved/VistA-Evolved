# Phase 428 -- Adapter Health Dashboard Panel -- VERIFY

## Gates

1. **Page exists**: `apps/web/src/app/cprs/admin/adapters/page.tsx` exists
2. **Nav entry**: admin layout includes "Adapter Health" nav item
3. **Three tabs**: Adapter Health, Domain Matrix, RPC Coverage
4. **Status badges**: ok=green, error=red, stub=yellow, implementation=blue
5. **Auto-refresh**: 30s interval with manual refresh button
6. **API integration**: fetches from `/api/adapters/health` and `/vista/runtime-matrix`
7. **Prompt folder**: `428-PHASE-428-ADAPTER-HEALTH-PANEL/` has IMPLEMENT + VERIFY + NOTES
8. **Linter**: `prompts-tree-health.mjs` -- 0 FAIL
