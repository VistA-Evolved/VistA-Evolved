# Phase 275 — Tenant & Feature Flag Control Plane Unification

## User Request
Make tenancy real: persist TenantConfig to PostgreSQL, add in-memory read cache
with TTL, unify the two co-existing feature flag systems (Phase 17A in-memory +
Phase 109 DB-backed `tenant_feature_flag`).

## Inventory
- `apps/api/src/config/tenant-config.ts` (283 lines) — pure in-memory Map store
- `apps/api/src/platform/pg/pg-migrate.ts` — v26 latest, next = v27
- `apps/api/src/platform/pg/pg-schema.ts` — Drizzle ORM schema
- `CANONICAL_RLS_TABLES` in pg-migrate.ts — add `tenant_config` entry
- Consumers: `onboarding-routes.ts`, `oidc-idp.ts`, `saml-broker-idp.ts`,
  `auth-routes.ts`, `tenant-context.ts`
- Store policy: `tenant-config` marked `pg_backed` but implemented as Map-only

## Implementation Steps

1. Add PG migration v27: `tenant_config` table
   - Columns: id (uuid pk), tenant_id (unique), facility_name, facility_station,
     vista_host, vista_port, vista_context, enabled_modules (jsonb),
     feature_flags (jsonb), ui_defaults (jsonb), note_templates (jsonb),
     connectors (jsonb), created_at, updated_at
   - Add to CANONICAL_RLS_TABLES

2. Create `apps/api/src/platform/pg/repo/tenant-config-repo.ts`
   - DB-backed CRUD matching existing API surface
   - PG read/write with in-memory cache (60s TTL)

3. Rewrite `tenant-config.ts` to delegate to DB repo when PG is available
   - On import: seed default tenant to DB if not present
   - All CRUD functions write-through to PG
   - Read functions: cache-first with TTL

4. All 5 consumers continue to work with zero changes (same export signatures)

## Verification Steps
- `getTenant("default")` returns valid config from DB
- `upsertTenant(...)` persists to PG and updates cache
- Feature flags updated via `updateFeatureFlags()` persist across restart
- `resolveTenantId()` works with DB-backed store
- Migration v27 applies cleanly

## Files Touched
- `apps/api/src/platform/pg/pg-migrate.ts` — add v27 migration + RLS entry
- `apps/api/src/platform/pg/repo/tenant-config-repo.ts` (NEW)
- `apps/api/src/config/tenant-config.ts` — rewrite to DB-backed
