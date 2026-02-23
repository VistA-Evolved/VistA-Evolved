# Phase 102 v2 — Migrate Prototype Stores to PlatformStore (IMPLEMENT)

## Goal
Eliminate in-memory registries / reset-on-restart state for platform modules
and migrate them into Postgres-backed PlatformStore.

## Scope
1. **Payer registry** → Postgres via PG repos (mirror SQLite repo API)
2. **Capability matrix** → New Postgres table + PG repo
3. **Payer audit** → Dual-write to Postgres `platform_audit_event`
4. **Seed loader** → Import JSON fixtures into Postgres on first run
5. **Store resolver** → Auto-select PG vs SQLite backend

## Files Created
- `apps/api/src/platform/pg/repo/payer-repo.ts` — PG payer CRUD
- `apps/api/src/platform/pg/repo/capability-repo.ts` — PG capability CRUD
- `apps/api/src/platform/pg/repo/task-repo.ts` — PG task CRUD
- `apps/api/src/platform/pg/repo/evidence-repo.ts` — PG evidence CRUD
- `apps/api/src/platform/pg/repo/audit-repo.ts` — PG audit queries
- `apps/api/src/platform/pg/repo/tenant-payer-repo.ts` — PG tenant-payer CRUD
- `apps/api/src/platform/pg/repo/index.ts` — barrel
- `apps/api/src/platform/pg/pg-seed.ts` — Postgres seed loader
- `apps/api/src/platform/pg/repo/capability-matrix-repo.ts` — PG capability matrix
- `apps/api/src/platform/store-resolver.ts` — PG vs SQLite selector

## Files Modified
- `apps/api/src/platform/pg/pg-schema.ts` — add capability_matrix_cell + evidence
- `apps/api/src/platform/pg/pg-migrate.ts` — add migration v5
- `apps/api/src/routes/admin-payer-db-routes.ts` — use store resolver
- `apps/api/src/platform/pg/index.ts` — export new modules
- `apps/api/src/platform/index.ts` — export store resolver
- `apps/api/src/index.ts` — call PG seed on startup
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — persistence indicator

## Verification
- `scripts/verify-phase102-registry-migration.ps1`
