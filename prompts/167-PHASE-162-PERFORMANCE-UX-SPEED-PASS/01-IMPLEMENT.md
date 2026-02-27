# Phase 162 -- Performance + UX Speed Pass (IMPLEMENT)

## User Request
Add performance profiling hooks, route-level timing budgets, response size
monitoring, and UX speed optimizations across the API.

## Implementation Steps

1. Create `apps/api/src/performance/` module:
   - `types.ts` -- PerformanceBudget, RouteProfile, SlowQueryLog
   - `profiler.ts` -- Route-level timing collection, budget enforcement
   - `budget-engine.ts` -- Configurable budgets per route pattern
   - `perf-routes.ts` -- Performance admin endpoints
   - `index.ts` -- Barrel export

2. Wire routes in index.ts

3. Add store policy entries

4. Create admin UI:
   - `apps/web/src/app/cprs/admin/performance/page.tsx`

5. Create runbook

## Files Touched
- apps/api/src/performance/types.ts (NEW)
- apps/api/src/performance/profiler.ts (NEW)
- apps/api/src/performance/budget-engine.ts (NEW)
- apps/api/src/performance/perf-routes.ts (NEW)
- apps/api/src/performance/index.ts (NEW)
- apps/api/src/index.ts (MODIFIED)
- apps/api/src/platform/store-policy.ts (MODIFIED)
- apps/web/src/app/cprs/admin/performance/page.tsx (NEW)
- docs/runbooks/phase162-performance-ux.md (NEW)
