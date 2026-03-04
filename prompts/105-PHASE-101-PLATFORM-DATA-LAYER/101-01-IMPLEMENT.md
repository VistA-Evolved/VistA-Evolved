# Phase 101 — Platform Data Architecture Convergence (IMPLEMENT)

## User Request

Introduce PostgreSQL as the default platform database for all non-clinical
SaaS/platform state. VistA/YottaDB remains the clinical source of truth.
Provide a complete PlatformStore abstraction with migrations, typed access,
tenant scoping, audit, idempotency table, and outbox table.

## Implementation Steps

### 1. Repo-wide Persistence Inventory

- Scan every runtime persistence mechanism (SQLite, JSONL, JSON R/W, in-memory Maps, ring buffers)
- Document in `docs/architecture/platform-persistence-inventory.md`
- Categorize by migration priority (Wave 1/2/3)

### 2. Platform Data Architecture Document

- Define data boundaries (VistA vs Postgres vs Object Storage)
- Tenancy model (shared DB + tenant_id + optional RLS)
- Schema conventions (snake_case, required columns)
- Core platform tables (platform_audit_event, idempotency_key, outbox_event)
- Migration strategy (parallel run -> cutover)
- Created: `docs/architecture/platform-data-architecture.md`

### 3. PostgreSQL Dev Infrastructure

- Docker Compose: `services/platform-db/docker-compose.yml` (Postgres 16 Alpine, port 5433)
- Init SQL: `services/platform-db/init.sql` (extensions + RLS helper function)
- Dev runbook: `docs/runbooks/platform-postgres-dev.md`

### 4. PlatformStore Module

- `apps/api/src/platform/pg/pg-db.ts` — Connection pool manager (node-postgres + drizzle)
- `apps/api/src/platform/pg/pg-schema.ts` — Full Postgres schema (pg-core types)
- `apps/api/src/platform/pg/pg-migrate.ts` — Versioned migration runner (4 migrations)
- `apps/api/src/platform/pg/pg-init.ts` — Initialization entrypoint
- `apps/api/src/platform/pg/tenant-context.ts` — Tenant-scoped query wrapper
- `apps/api/src/platform/pg/tenant-middleware.ts` — Fastify tenant resolution hook
- `apps/api/src/platform/pg/index.ts` — Barrel export

### 5. Package + Env Wiring

- Added `pg` ^8.18.0 and `@types/pg` ^8.16.0 to package.json
- Added PLATFORM_PG_URL, pool, RLS env vars to .env.example
- Wired initPlatformPg() into index.ts startup
- Wired closePgDb() into security.ts graceful shutdown
- Updated /health endpoint to report platformPg status

### 6. Tenant Safety Guardrails

- tenant-context.ts: createTenantContext() with SQL injection guard
- tenant-middleware.ts: Fastify hook for X-Tenant-Id resolution
- RLS policies via applyRlsPolicies() (opt-in via PLATFORM_PG_RLS_ENABLED)
- Every table has tenant_id column

### 7. No Breaking Changes

- SQLite path completely untouched (db.ts, schema.ts, migrate.ts, init.ts, seed.ts, repo/)
- Postgres is OPTIONAL — only activates when PLATFORM_PG_URL is set
- Platform barrel export includes both SQLite and Postgres exports

## Verification Steps

Run: `.\scripts\verify-phase101-platform-data-layer.ps1`

## Files Touched

### Created

- `docs/architecture/platform-persistence-inventory.md`
- `docs/architecture/platform-data-architecture.md`
- `services/platform-db/docker-compose.yml`
- `services/platform-db/init.sql`
- `docs/runbooks/platform-postgres-dev.md`
- `apps/api/src/platform/pg/pg-db.ts`
- `apps/api/src/platform/pg/pg-schema.ts`
- `apps/api/src/platform/pg/pg-migrate.ts`
- `apps/api/src/platform/pg/pg-init.ts`
- `apps/api/src/platform/pg/tenant-context.ts`
- `apps/api/src/platform/pg/tenant-middleware.ts`
- `apps/api/src/platform/pg/index.ts`
- `scripts/verify-phase101-platform-data-layer.ps1`
- `prompts/105-PHASE-101-PLATFORM-DATA-LAYER/101-01-IMPLEMENT.md`
- `prompts/105-PHASE-101-PLATFORM-DATA-LAYER/101-99-VERIFY.md`

### Modified

- `apps/api/package.json` — added pg, @types/pg
- `apps/api/.env.example` — added Platform DB section
- `apps/api/src/platform/index.ts` — added Postgres exports
- `apps/api/src/index.ts` — added Postgres init + health
- `apps/api/src/middleware/security.ts` — added closePgDb on shutdown
- `scripts/verify-latest.ps1` — delegates to Phase 101
