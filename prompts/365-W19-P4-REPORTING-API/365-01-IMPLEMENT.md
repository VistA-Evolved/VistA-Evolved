# Phase 365 — W19-P4: Reporting API + UI

## Implementation Steps

1. Create `apps/api/src/analytics/reporting-service.ts` with report definitions.
2. Report types: active users, errors, queue lag, uptime, patient volume, appointments.
3. Create `apps/api/src/routes/reporting-routes.ts` with endpoints.
4. Create `apps/web/src/app/cprs/admin/reporting/page.tsx` dashboard UI.
5. CSV/JSON export with audit trail.
6. Tenant admin and platform admin views.

## Files Touched

- `apps/api/src/analytics/reporting-service.ts`
- `apps/api/src/routes/reporting-routes.ts`
- `apps/web/src/app/cprs/admin/reporting/page.tsx`
- `apps/api/src/server/register-routes.ts`
- `apps/api/src/middleware/security.ts`
