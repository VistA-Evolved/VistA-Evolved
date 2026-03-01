# Phase 368 — W19-P7: Data Access Controls

## Implementation Steps

1. Create `apps/api/src/analytics/data-access-controls.ts`.
2. Dataset permissions model (who can see which datasets).
3. Column masking rules (sensitive fields hidden by role).
4. Export policies (step-up auth for raw exports, reasons required).
5. Audit logs for all dataset access.
6. Register access control middleware for analytics routes.

## Files Touched

- `apps/api/src/analytics/data-access-controls.ts`
- `apps/api/src/routes/reporting-routes.ts` (enforce access controls)
- `apps/api/src/routes/analytics-extract-routes.ts` (enforce access controls)
