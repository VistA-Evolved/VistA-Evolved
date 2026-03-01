# Phase 363 — W19-P2: Analytics Extract Layer

## Implementation Steps

1. Create `apps/api/src/analytics/extract-layer.ts` with incremental extract jobs.
2. Extract by `updated_at` offset for domain stores (claims, sessions, events).
3. Materialize into PG analytics tables via migration.
4. Ensure tenant isolation on all extract queries.
5. Add extract run report with counts per entity type.
6. Register routes for extract management.

## Files Touched

- `apps/api/src/analytics/extract-layer.ts`
- `apps/api/src/analytics/extract-types.ts`
- `apps/api/src/routes/analytics-extract-routes.ts`
- `apps/api/src/platform/pg/pg-migrate.ts` (new analytics tables)
- `apps/api/src/server/register-routes.ts`
- `apps/api/src/middleware/security.ts`
