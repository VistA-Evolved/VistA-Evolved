# Phase 390 — W22-P2 IMPLEMENT: Clinical Content Pack Framework v2

## Implementation Steps

1. Create `apps/api/src/content-packs/types.ts` — ContentPackV2 schema with
   order sets, flowsheets, inbox rules, dashboards, CDS rules, migrations
2. Create `apps/api/src/content-packs/pack-store.ts` — in-memory stores
   for all content types + install/rollback lifecycle
3. Create `apps/api/src/content-packs/pack-routes.ts` — REST endpoints
   for pack management (install, preview, rollback, query)
4. Create `apps/api/src/content-packs/index.ts` — barrel export
5. Wire routes into `register-routes.ts` (after templateRoutes)
6. Add AUTH_RULES in `security.ts` (admin for install/rollback, session for reads)
7. Add store policy entries in `store-policy.ts` (7 stores)

## Files Touched

- `apps/api/src/content-packs/types.ts` — new
- `apps/api/src/content-packs/pack-store.ts` — new
- `apps/api/src/content-packs/pack-routes.ts` — new
- `apps/api/src/content-packs/index.ts` — new
- `apps/api/src/server/register-routes.ts` — import + register
- `apps/api/src/middleware/security.ts` — AUTH_RULES for /content-packs/
- `apps/api/src/platform/store-policy.ts` — 7 store entries
