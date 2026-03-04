# Phase 125 — IMPLEMENT: Postgres-Only Production Data Plane

## User Request

Postgres-only production data plane: no SQLite runtime, no JSON datastores in rc/prod modes.

## Implementation Steps

### Step 0 — Inventory + PromptOS

- Scanned: store-resolver.ts, pg-db.ts, pg-migrate.ts, posture/, payer-persistence.ts, index.ts
- SQLite refs: 20+ repos in platform/db/repo/, store-resolver dual-path, init.ts
- JSON mutable stores: payer-persistence.ts (registry-db.json, tenant-overrides.json)
- In-memory Map stores: ~50+ (ephemeral by design, out of scope)
- PG repos: 10 in platform/pg/repo/, store-resolver routes 6 through

### Step 1 — Runtime Mode Contract

- New env var: `PLATFORM_RUNTIME_MODE = dev | test | rc | prod` (default: dev)
- `resolveBackend()` enforces PG for rc/prod (throws if SQLite would be selected)
- `applyRlsPolicies()` auto-enables for rc/prod (already does for NODE_ENV=production)
- Create `apps/api/src/platform/runtime-mode.ts` as single source of truth

### Step 2 — Store Resolver Enforcement

- `store-resolver.ts`: In rc/prod, `resolveBackend()` returns "pg" or throws
- No sqlite fallback path in rc/prod
- Dev/test continue to work with SQLite (no behavior change)

### Step 3 — JSON Mutable Store Guard

- `payer-persistence.ts`: Guard writes with runtime mode check
- In rc/prod, refuse JSON file writes (log error, throw)
- Create PG-backed payer persistence alternative that store-resolver routes to

### Step 4 — Posture Gate: Data Plane

- New posture domain: `data-plane-posture.ts`
- Gates: runtime-mode set, PG connected, RLS active, no-sqlite-runtime, no-json-writes
- Add to unified posture endpoint

### Step 5 — Migration Script

- `scripts/migrations/sqlite-to-pg.mjs`: One-shot SQLite -> PG data transfer
- Reads all SQLite tables, inserts into PG
- Idempotent (skips existing records by PK)

### Step 6 — CI / Gauntlet

- RC gauntlet profile sets PLATFORM_RUNTIME_MODE=rc
- Verify PG is required in RC mode

### Step 7 — Docs + Commit

- `docs/runbooks/postgres-only-dataplane.md`
- Single coherent commit

## Files Touched

- `apps/api/src/platform/runtime-mode.ts` (NEW)
- `apps/api/src/platform/store-resolver.ts` (EDIT)
- `apps/api/src/platform/pg/pg-migrate.ts` (EDIT - RLS auto-enable for rc)
- `apps/api/src/posture/data-plane-posture.ts` (NEW)
- `apps/api/src/posture/index.ts` (EDIT)
- `apps/api/src/rcm/payers/payer-persistence.ts` (EDIT - guard writes)
- `apps/api/src/index.ts` (EDIT - runtime mode init)
- `scripts/migrations/sqlite-to-pg.mjs` (NEW)
- `docs/runbooks/postgres-only-dataplane.md` (NEW)

## Verification

- TypeScript clean (3 apps)
- Build clean (3 apps)
- Dev mode: SQLite still works (no regression)
- RC mode: PG required, SQLite blocked
- Posture gate: passes when PG + RLS active
