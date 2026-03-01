# Phase 373 — W20-P4 IMPLEMENT: Support Ops Automation

## User Request
Build ticket integration hooks, automated diagnostic bundle generator, SLA timers,
and runbooks index linked from support console.

## Implementation Steps

1. Create support-ops-service.ts with ticket lifecycle, diagnostics bundle gen,
   SLA timer tracking, and runbook index
2. Create support-ops-routes.ts with admin endpoints
3. Wire routes and AUTH_RULES
4. Register stores in store-policy.ts

## Files Touched
- apps/api/src/services/support-ops-service.ts
- apps/api/src/routes/support-ops-routes.ts
- apps/api/src/server/register-routes.ts
- apps/api/src/middleware/security.ts
- apps/api/src/platform/store-policy.ts
