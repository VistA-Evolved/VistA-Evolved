# Phase 126 IMPLEMENT — RCM Durability Wave (Map Stores -> Postgres)

## User Request

Eliminate high-risk in-memory Maps in RCM operational state. Postgres is the
only durable store. VistA IB/AR/PCE stays authoritative -- we persist workflow
state and operational artifacts only.

## Target Files

1. `apps/api/src/rcm/domain/claim-store.ts` -- already has SQLite; needs PG repo + re-wire
2. `apps/api/src/rcm/claims/claim-store.ts` -- already has SQLite; needs PG repo + re-wire
3. `apps/api/src/rcm/claim-lifecycle/scrubber.ts` -- already fully DB-backed; NO changes
4. `apps/api/src/rcm/edi/ack-status-processor.ts` -- 6 Maps, zero DB; needs full overhaul
5. `apps/api/src/rcm/edi/pipeline.ts` -- 2 Maps, zero DB; needs full overhaul

## Implementation Steps

1. Add 6 Drizzle table definitions to `pg-schema.ts`:
   - pgRcmClaim, pgRcmRemittance, pgRcmClaimCase (mirrors of SQLite Phase 121)
   - pgEdiAck, pgEdiClaimStatus, pgEdiPipelineEntry (NEW)
2. Add PG migration v10 (`rcm_durability_pg`) with DDL for all 6 tables + indexes
3. Add 6 new tables to `applyRlsPolicies()` tenant list
4. Create 4 PG repo files:
   - `platform/pg/repo/rcm-claim-repo.ts` (async mirror of SQLite)
   - `platform/pg/repo/rcm-claim-case-repo.ts` (async mirror of SQLite)
   - `platform/pg/repo/edi-ack-repo.ts` (NEW: acks + status updates)
   - `platform/pg/repo/edi-pipeline-repo.ts` (NEW: pipeline entries)
5. Update PG repo barrel export (`platform/pg/repo/index.ts`)
6. Modify `ack-status-processor.ts`:
   - Add AckRepo interface + initAckStatusRepo() injection
   - Write-through on ingestAck() and ingestStatusUpdate()
   - DB-fallback reads (cache-first pattern)
7. Modify `pipeline.ts`:
   - Add PipelineRepo interface + initPipelineRepo() injection
   - Write-through on createPipelineEntry() and advancePipelineStage()
8. Wire all repos in `index.ts`:
   - PG re-wire for rcm-claim, rcm-claim-case (overrides SQLite)
   - PG wiring for edi-ack, edi-pipeline (new -- no SQLite predecessor)
9. Extend restart-durability gate with Phase 126 checks (50+ new gates)
10. Add Phase 126 to gauntlet phase-manifest.json

## Files Touched

- `apps/api/src/platform/pg/pg-schema.ts` -- 6 new table definitions
- `apps/api/src/platform/pg/pg-migrate.ts` -- v10 migration + RLS list
- `apps/api/src/platform/pg/repo/rcm-claim-repo.ts` -- NEW
- `apps/api/src/platform/pg/repo/rcm-claim-case-repo.ts` -- NEW
- `apps/api/src/platform/pg/repo/edi-ack-repo.ts` -- NEW
- `apps/api/src/platform/pg/repo/edi-pipeline-repo.ts` -- NEW
- `apps/api/src/platform/pg/repo/index.ts` -- barrel exports
- `apps/api/src/rcm/edi/ack-status-processor.ts` -- repo injection + write-through
- `apps/api/src/rcm/edi/pipeline.ts` -- repo injection + write-through
- `apps/api/src/index.ts` -- PG re-wiring for 4 stores
- `scripts/qa-gates/restart-durability.mjs` -- Phase 126 checks
- `qa/gauntlet/phase-manifest.json` -- Phase 126 entry

## Verification

Run `scripts/verify-latest.ps1` or `node scripts/qa-gates/restart-durability.mjs`
