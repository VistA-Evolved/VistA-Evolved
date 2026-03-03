# Phase 561 (W41-P4): Verify Scheduling Writeback PG

## Verification Steps
1. `tsc --noEmit` — zero TS errors
2. writeback-guard.ts exports initWritebackGuardRepo and rehydrateWritebackEntries
3. lifecycle.ts W41 block imports and wires writeback-guard
4. persistWritebackEntry fires on trackWriteback, updateWritebackStatus, enforceTruthGate
5. store-policy.ts scheduling-writeback-entries entry is pg_write_through
6. scheduling_writeback_entry table in v58 migration with correct columns

## Pass Criteria
- Zero TS errors
- Write-through fires on all 3 mutation paths
- Rehydration populates Map from PG on startup
