# Phase 275 — VERIFY: Tenant Control Plane

## Gates

1. PG migration v27 creates `tenant_config` table with all columns
2. `tenant_config` is in CANONICAL_RLS_TABLES
3. `tenant-config-repo.ts` exports DB-backed CRUD
4. `tenant-config.ts` delegates to PG when pool is available
5. Default tenant auto-seeded on startup
6. `getTenant`, `listTenants`, `upsertTenant`, `deleteTenant` all DB-backed
7. Feature flags persist across API restart (not just in-memory)
8. All 5 consumers compile without changes
9. TypeScript compiles cleanly
