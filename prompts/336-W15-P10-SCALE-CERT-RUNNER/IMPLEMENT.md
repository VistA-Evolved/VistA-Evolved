# Phase 336 — W15-P10: Scale Certification Runner

## User Request

Implement the scale certification runner as Phase 336 of Wave 15.

## Implementation Steps

1. Create `apps/api/src/services/scale-cert-runner.ts` — 20 gate definitions
   across 8 categories, certification engine with scoring and verdict,
   profiles, schedules, trends, badges, evidence hashing
2. Create `apps/api/src/routes/scale-cert-runner-routes.ts` — 16 REST endpoints
3. Wire AUTH_RULES in security.ts (`/platform/cert/` → admin)
4. Wire import + register in register-routes.ts
5. Add 4 store entries in store-policy.ts
6. Type-check with tsc --noEmit

## Files Touched

- `apps/api/src/services/scale-cert-runner.ts` (NEW)
- `apps/api/src/routes/scale-cert-runner-routes.ts` (NEW)
- `apps/api/src/middleware/security.ts` (MODIFIED — +1 AUTH_RULE)
- `apps/api/src/server/register-routes.ts` (MODIFIED — +import, +register)
- `apps/api/src/platform/store-policy.ts` (MODIFIED — +4 store entries)
