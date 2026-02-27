# Phase 162 -- Performance + UX Speed Pass (VERIFY)

## Verification Gates

1. **TypeScript** -- `pnpm -C apps/api exec tsc --noEmit` clean
2. **TypeScript (web)** -- `pnpm -C apps/web exec tsc --noEmit` clean
3. **Profiler module** -- profiler.ts exports recordRouteProfile, getSlowRoutes
4. **Budget engine** -- budget-engine.ts exports checkBudget, setBudget
5. **Routes wired** -- grep perfRoutes in index.ts
6. **Store policy** -- entries for profiler stores
7. **UI page** -- page.tsx at cprs/admin/performance/
8. **Runbook** -- phase162 runbook in docs/runbooks/
