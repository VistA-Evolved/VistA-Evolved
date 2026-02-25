# Phase 128 — Imaging + Scheduling Durability (Postgres Repos + Restart Gate)

## User Request

Persist imaging worklist/ingest and scheduling request/locks in Postgres with TTL semantics.

## Hard Requirements

- Do not fake VistA scheduling truth.
- Persist only operational tracking and locks, not "appointments truth" if VistA is source.
- Locks must have `expires_at` TTL and safe concurrency.

## Implementation Steps

1. **PG Schema** (`pg-schema.ts`): Add 4 Drizzle `pgTable` definitions:
   - `imaging_work_item` — mirrors WorklistItem fields
   - `imaging_ingest_event` — study linkage + unmatched records
   - `scheduling_waitlist_request` — waitlist/request tracking
   - `scheduling_booking_lock` — TTL-based booking locks with `expires_at`

2. **PG Migration** (`pg-migrate.ts`): Add v12 migration DDL for all 4 tables + indexes. Add tables to RLS tenant list.

3. **PG Repos** (4 new files in `platform/pg/repo/`):
   - `pg-imaging-worklist-repo.ts` — async CRUD for imaging_work_item
   - `pg-imaging-ingest-repo.ts` — async CRUD for imaging_ingest_event (linkage + unmatched)
   - `pg-scheduling-request-repo.ts` — async CRUD for scheduling_waitlist_request
   - `pg-scheduling-lock-repo.ts` — async CRUD for scheduling_booking_lock with TTL

4. **PG Barrel** (`pg/repo/index.ts`): Export the 4 new repos.

5. **Store Wiring** (`index.ts`): Wire PG repos to stores when `backend === "pg"`:
   - Re-wire imaging-worklist, imaging-ingest with PG repos
   - Re-wire scheduling request store with PG repo
   - Wire booking lock store to PG repo

6. **Store Async Safety**: Apply Phase 127 pattern — `await Promise.resolve()` on all PG repo read paths.

7. **Restart Gate** (`scripts/qa-gates/imaging-scheduling-restart.mjs`): Verify:
   - PG schema has all 4 tables
   - PG migration v12 exists
   - All 4 PG repos exist with expected exports
   - Stores have init*Repo functions
   - Index.ts wires PG repos
   - Barrel exports all 4 repos
   - RLS tenant list includes all 4 tables

8. **Gauntlet Wire** (`qa/gauntlet/`): Add G13 gate wrapping the restart gate, include in RC suite.

## Files Touched

- `apps/api/src/platform/pg/pg-schema.ts` — add 4 table definitions
- `apps/api/src/platform/pg/pg-migrate.ts` — add v12 migration + RLS tables
- `apps/api/src/platform/pg/repo/pg-imaging-worklist-repo.ts` — NEW
- `apps/api/src/platform/pg/repo/pg-imaging-ingest-repo.ts` — NEW
- `apps/api/src/platform/pg/repo/pg-scheduling-request-repo.ts` — NEW
- `apps/api/src/platform/pg/repo/pg-scheduling-lock-repo.ts` — NEW
- `apps/api/src/platform/pg/repo/index.ts` — add 4 barrel exports
- `apps/api/src/services/imaging-worklist.ts` — add PG repo interface + async wiring
- `apps/api/src/services/imaging-ingest.ts` — add PG repo interface + async wiring
- `apps/api/src/adapters/scheduling/vista-adapter.ts` — add PG lock repo + async wiring
- `apps/api/src/index.ts` — wire PG repos in pg block
- `scripts/qa-gates/imaging-scheduling-restart.mjs` — NEW restart gate
- `qa/gauntlet/gates/g13-imaging-scheduling-restart.mjs` — NEW gauntlet gate
- `qa/gauntlet/cli.mjs` — add G13 to RC+FULL suites

## Verification

- `pnpm exec tsc --noEmit` passes
- `node scripts/qa-gates/imaging-scheduling-restart.mjs` — all PASS
- `node qa/gauntlet/cli.mjs --suite rc` — all PASS
