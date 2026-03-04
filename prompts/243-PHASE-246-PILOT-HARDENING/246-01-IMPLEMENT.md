# Phase 246 — Pilot Hospital Hardening (Wave 6 P9)

## User Request

Pilot hospital readiness layer that adds site-specific configuration,
pre-flight checks, environment validation, and a unified readiness
dashboard for go-live preparation.

## Implementation Steps

1. Create `apps/api/src/pilot/site-config.ts` — site configuration store
2. Create `apps/api/src/pilot/preflight.ts` — pre-flight check engine
3. Create `apps/api/src/routes/pilot-routes.ts` — pilot readiness API
4. Create `apps/web/src/app/cprs/admin/pilot/page.tsx` — pilot dashboard UI
5. Wire routes into register-routes.ts
6. Add "Pilot" to admin layout nav
7. Create verification script

## Files Touched

- `apps/api/src/pilot/site-config.ts` (NEW)
- `apps/api/src/pilot/preflight.ts` (NEW)
- `apps/api/src/routes/pilot-routes.ts` (NEW)
- `apps/web/src/app/cprs/admin/pilot/page.tsx` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED)
