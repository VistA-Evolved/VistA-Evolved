# Phase 367 — W19-P6: RCM Analytics v1

## Implementation Steps

1. Create `apps/api/src/analytics/rcm-analytics.ts`.
2. Metrics: claim submission rate, ack/reject rate, denial reasons distribution,
   days-in-AR estimate.
3. Wire to existing claim-store and EDI pipeline data.
4. RCM analytics dashboard endpoints.
5. Add RCM Analytics tab to admin UI.

## Files Touched

- `apps/api/src/analytics/rcm-analytics.ts`
- `apps/api/src/routes/reporting-routes.ts` (add RCM endpoints)
- `apps/web/src/app/cprs/admin/reporting/page.tsx` (add RCM tab)
