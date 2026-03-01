# Phase 366 — W19-P5: Quality & Safety Metrics v1

## Implementation Steps

1. Create `apps/api/src/analytics/quality-metrics.ts`.
2. Implement measures: abnormal lab follow-up time, medication order-to-admin
   time, note completion timeliness.
3. Metric runs with timestamps and input references.
4. Audited, tenant-scoped export.
5. Register endpoints in analytics extract routes.

## Files Touched

- `apps/api/src/analytics/quality-metrics.ts`
- `apps/api/src/routes/reporting-routes.ts` (add quality endpoints)
