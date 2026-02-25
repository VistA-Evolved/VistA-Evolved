# Postgres-Only Production Data Plane

> Phase 125 -- Eliminate SQLite runtime and JSON datastores from rc/prod.

## Overview

Phase 125 introduces a **runtime mode contract** that enforces PostgreSQL as
the sole durable store in release-candidate (rc) and production (prod)
deployments. SQLite remains available for local development (dev) and CI
testing (test), but is blocked at startup in rc/prod.

## Runtime Modes

| Mode | SQLite | PG Required | RLS | JSON Writes |
|------|--------|-------------|-----|-------------|
| `dev`  | Allowed | Optional | Optional | Allowed |
| `test` | Allowed | Optional | Optional | Allowed |
| `rc`   | **Blocked** | **Required** | **Auto-enabled** | **Blocked** |
| `prod` | **Blocked** | **Required** | **Auto-enabled** | **Blocked** |

Set the mode via:
```
PLATFORM_RUNTIME_MODE=rc   # or prod, dev, test
```

If unset, defaults to `dev`. If `NODE_ENV=production` and no mode is set,
it auto-maps to `prod`.

## Env Vars

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PLATFORM_RUNTIME_MODE` | No | `dev` | Runtime mode (dev/test/rc/prod) |
| `PLATFORM_PG_URL` | In rc/prod | - | PostgreSQL connection string |
| `STORE_BACKEND` | No | `auto` | auto/pg/sqlite (sqlite blocked in rc/prod) |
| `PLATFORM_PG_RLS_ENABLED` | No | auto | Explicit RLS override (auto-enabled in rc/prod) |

## Migration: SQLite to PostgreSQL

### One-shot data transfer

```bash
# Prerequisites: API has been started at least once (creates platform.db)
# PLATFORM_PG_URL must be set. PG migrations must be applied.

# Dry run (check row counts)
node scripts/migrations/sqlite-to-pg.mjs --dry-run

# Live migration
node scripts/migrations/sqlite-to-pg.mjs

# Single table
node scripts/migrations/sqlite-to-pg.mjs --table payer
```

The migration uses `ON CONFLICT DO NOTHING` -- safe to re-run.

### Switching to rc/prod mode

1. Ensure PostgreSQL is running and healthy
2. Set `PLATFORM_PG_URL` in your env
3. Run `node scripts/migrations/sqlite-to-pg.mjs` to transfer data
4. Set `PLATFORM_RUNTIME_MODE=rc` (or `prod`)
5. Start the API -- it will validate PG is configured and refuse SQLite
6. Check posture: `curl http://localhost:3001/posture/data-plane`

## Posture Endpoint

```
GET /posture/data-plane
```

Returns 6 gates:
- `runtime_mode` -- mode is recognized
- `pg_connected` -- PG is configured (critical in rc/prod)
- `store_backend` -- resolves to "pg" (critical in rc/prod)
- `no_sqlite_runtime` -- SQLite blocked (critical in rc/prod)
- `json_stores_blocked` -- JSON file writes blocked (critical in rc/prod)
- `rls_enforcement` -- RLS auto-enabled for rc/prod

## Gauntlet Gate

G12 (Data Plane) is part of the RC and FULL gauntlet suites. It validates:
- `runtime-mode.ts` exists with all required exports
- `store-resolver.ts` imports runtime-mode and enforces PG
- `data-plane-posture.ts` exports `checkDataPlanePosture`
- `payer-persistence.ts` guards JSON writes
- `pg-migrate.ts` auto-enables RLS for rc/prod
- Migration script exists

## Architecture

```
apps/api/src/
  platform/
    runtime-mode.ts        -- Single source of truth for runtime mode
    store-resolver.ts      -- Switches PG/SQLite, blocks SQLite in rc/prod
    pg/
      pg-migrate.ts        -- Auto-enables RLS in rc/prod
  posture/
    data-plane-posture.ts  -- 6 production readiness gates
    index.ts               -- /posture/data-plane endpoint
  rcm/payers/
    payer-persistence.ts   -- JSON writes blocked in rc/prod

qa/gauntlet/
  gates/g12-data-plane.mjs -- G12 gauntlet gate

scripts/migrations/
  sqlite-to-pg.mjs        -- One-shot SQLite -> PG data transfer
```

## What's NOT migrated (by design)

In-memory Map stores (~50+ across the codebase) are **intentionally ephemeral**.
They reset on API restart and serve as caches or VistA-first transient stores.
These include:
- Imaging worklist/ingest stores
- Telehealth room store
- EDI pipeline state
- Clinical report caches
- Rate limit buckets
- Draft stores

These will be migrated to durable storage individually as each subsystem
reaches production readiness, using the established 4-step migration plan
documented in each store's header comment.
