# Phase 117 -- IMPLEMENT: Postgres-First Prod Posture + Multi-Instance

## User Request

Make Postgres the production default for platform durability. Prove horizontal
scaling by running 2 API instances sharing the same PG and showing
sessions/workqueues behave correctly.

## Implementation Steps

1. Add `docker-compose.prod.yml` platform-db service + dual-API config
2. Add `STORE_BACKEND` env var: `auto` (default), `sqlite`, `pg`
   - `auto`: PG if `PLATFORM_PG_URL` set, else SQLite
   - `pg`: require PG, fail-fast if not configured
   - `sqlite`: force SQLite even if PG configured (dev override)
3. Wire PG session/workqueue repos in index.ts when PG is active
4. Add PG migration v9: durable session + workqueue + index tables
5. Create PG session-repo and workqueue-repo (async, mirrors SQLite API)
6. Add multi-instance simulation test script
7. Add DB indexes: tenant_id, status+updated_at, expires_at
8. Add PITR/backup runbook

## Verification Steps

- `npx tsc --noEmit` clean
- Phase 117 verifier: all gates pass
- Multi-instance test: session cross-validated, workqueue cross-dequeued
- `next build` clean

## Files Touched

- `docker-compose.prod.yml` -- add platform-db service + 2nd API replica
- `apps/api/src/platform/store-resolver.ts` -- STORE_BACKEND env var
- `apps/api/src/platform/pg/pg-migrate.ts` -- v9 migration (sessions, workqueue, indexes)
- `apps/api/src/platform/pg/pg-schema.ts` -- PG session + workqueue tables
- `apps/api/src/platform/pg/repo/session-repo.ts` -- NEW: PG session repo
- `apps/api/src/platform/pg/repo/workqueue-repo.ts` -- NEW: PG workqueue repo
- `apps/api/src/index.ts` -- conditional PG repo wiring
- `scripts/test-multi-instance.mjs` -- NEW: multi-instance simulation
- `scripts/verify-phase117-pg-prod-posture.ps1` -- NEW: verifier
- `docs/runbooks/pg-backup-pitr.md` -- NEW: backup/PITR runbook
- `prompts/120-PHASE-117-PG-PROD-POSTURE/117-01-IMPLEMENT.md` -- this file
