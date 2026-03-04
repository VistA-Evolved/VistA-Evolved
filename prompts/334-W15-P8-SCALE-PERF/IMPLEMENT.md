# Phase 334 — IMPLEMENT: Scale Performance Campaign (W15-P8)

## User Request

Implement multi-region load testing profiles, SLO tracking with error budgets,
performance campaign orchestration, and regression detection.

## Implementation Steps

1. Create `apps/api/src/services/scale-performance.ts`
   - Load test profiles (endpoints, VUs, thresholds, regions)
   - Run lifecycle: start → complete (with results + verdict)
   - Automatic regression detection against previous runs (10%+ degradation)
   - SLO definitions (latency, availability, ratio) with error budget tracking
   - Performance campaigns with milestones
2. Create `apps/api/src/routes/scale-performance-routes.ts`
   - 20 REST endpoints (profiles, runs, SLOs, campaigns, regressions, audit)
3. Wire AUTH_RULES, register-routes, store-policy

## Files Touched

- apps/api/src/services/scale-performance.ts (NEW)
- apps/api/src/routes/scale-performance-routes.ts (NEW)
- apps/api/src/middleware/security.ts (1 AUTH_RULE)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (6 store entries)
