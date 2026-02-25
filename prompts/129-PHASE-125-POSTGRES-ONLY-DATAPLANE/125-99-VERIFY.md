# Phase 125 — VERIFY: Postgres-Only Production Data Plane

## Verification Gates

### G1: TypeScript Clean
- `pnpm -C apps/api exec tsc --noEmit` — 0 errors
- `pnpm -C apps/web exec tsc --noEmit` — 0 errors
- `pnpm -C apps/portal exec tsc --noEmit` — 0 errors

### G2: Build Clean
- `pnpm -C apps/api build` — 0 errors
- `pnpm -C apps/web build` — 0 errors
- `pnpm -C apps/portal build` — 0 errors

### G3: Runtime Mode Contract
- `PLATFORM_RUNTIME_MODE=dev` + no PG_URL — SQLite works (no error)
- `PLATFORM_RUNTIME_MODE=rc` + no PG_URL — throws on startup
- `PLATFORM_RUNTIME_MODE=prod` + no PG_URL — throws on startup
- `PLATFORM_RUNTIME_MODE=rc` + PG_URL — PG used, no SQLite

### G4: Store Resolver Enforcement
- rc/prod: `resolveBackend()` returns "pg" only
- rc/prod: SQLite repos never instantiated in store path
- dev: both backends still available

### G5: Posture Gate
- `/posture/data-plane` returns runtime mode + PG status + RLS status
- All gates pass when PG + RLS active in rc/prod mode
- Gates warn (not fail) in dev mode with SQLite

### G6: RLS Enforcement
- rc/prod: RLS auto-enabled (no explicit env var needed)
- All 25 tenant-scoped tables have policies
- FORCE RLS active on all tables

### G7: Migration Script
- `node scripts/migrations/sqlite-to-pg.mjs` runs without error
- Data transfers correctly from SQLite to PG

### G8: Gauntlet
- FAST suite: 4+ PASS
- RC suite: 8+ PASS (with PG)
