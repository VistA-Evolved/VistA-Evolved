# Phase 126 VERIFY -- RCM Durability Wave

## Verification Results

### Sanity

- No reports folder created by Phase 126 (pre-existing docs/reports from Phase 53 only)
- PG-only posture enforced: store-resolver blocks SQLite in rc/prod (Phase 125 intact)

### Bug Fixed During Verify

- **pipeline.ts `void` + `try/catch` bug**: `void dbRepo.insertPipelineEntry(...)` inside
  `try/catch` never catches async rejections. Fixed to use `.catch()` on the promise directly.
  Same fix applied to `advancePipelineStage` `updateEntry` call. The `ack-status-processor.ts`
  correctly uses `await` and was not affected.

### Feature Integrity

- Restart durability gate: **124 PASS / 0 FAIL**
- Data contract audit: **84 fields, 12 indexes — 0 issues, 4 non-blocking advisories**
- All 6 Drizzle schema tables match DDL migration 1:1 (columns, types, defaults, indexes)
- All 4 write-through call sites map domain fields to repo params correctly
- PG repo barrel: 4 new exports present and wired

### Regression

- TypeCheck: **CLEAN** (0 errors across API, web, portal)
- API build (tsc): **PASS**
- Web/portal build: **EPERM** (pre-existing Windows+OneDrive file-lock issue, confirmed
  identical on pre-Phase-126 code via git stash test)
- Gauntlet FAST: **4 PASS / 0 FAIL / 1 WARN** (G3 cosmetic console.warn)
- Gauntlet RC: **8 PASS / 1 FAIL (G1 pre-existing EPERM) / 1 SKIP (G5 API) / 1 WARN (G3)**
  - Confirmed G1 fail is identical with Phase 126 changes stashed — zero regressions

### Map Stores Eliminated

- `claim-store.ts` (domain) — PG-backed via rcm-claim-repo
- `claim-store.ts` (claims) — PG-backed via rcm-claim-case-repo
- `ack-status-processor.ts` — PG write-through (cache-first reads)
- `pipeline.ts` — PG write-through (cache-first reads)
- `scrubber.ts` — already fully DB-backed (no changes needed)
- **Total: 4 stores moved to PG, 1 already durable = 5/5 target stores durable**

## Gates

- PG schema: 6 new tables in pg-schema.ts
- PG migration v10: 6 CREATE TABLE + indexes
- RLS: 6 new tables in applyRlsPolicies() (31 total)
- PG repos: 4 new files with correct async exports
- Barrel: 4 new exports in pg/repo/index.ts
- ack-status-processor: initAckStatusRepo + write-through
- pipeline: initPipelineRepo + write-through (fixed async error handling)
- index.ts: 4 new PG re-wire blocks
- restart-durability gate: 124 PASS / 0 FAIL
- phase-manifest: Phase 126 entry with rcm/durability/postgres tags
