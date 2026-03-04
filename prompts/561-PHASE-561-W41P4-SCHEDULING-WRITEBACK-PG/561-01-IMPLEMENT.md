# Phase 561 (W41-P4): Scheduling Writeback PG

## User Request

Wire writeback-guard.ts scheduling entries to PG for restart-safe truth gate tracking.

## Implementation Steps

1. Create WritebackRepo interface
2. Add \_writebackRepo lazy variable
3. Implement initWritebackGuardRepo() and rehydrateWritebackEntries()
4. Implement persistWritebackEntry() fire-and-forget helper
5. Wire persist into trackWriteback(), updateWritebackStatus(), enforceTruthGate()
6. Wire in lifecycle.ts W41 block
7. Created scheduling_writeback_entry PG table in v58 migration

## Files Touched

- apps/api/src/routes/scheduling/writeback-guard.ts (PG wiring + persist calls)
- apps/api/src/platform/pg/pg-migrate.ts (v58 migration)
- apps/api/src/server/lifecycle.ts (W41 wiring block)
- apps/api/src/platform/store-policy.ts (entry updated)

## Notes

- New PG table scheduling_writeback_entry (v58) with indexes on tenant_id, status, appointment_ref
- Truth gate results stored as JSONB
