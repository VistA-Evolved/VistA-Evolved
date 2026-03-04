# Phase 558 (W41-P1): PG-Backed Clinical Writeback Command Bus

## User Request

Wire the clinical writeback command bus (command-store.ts) to PG for restart-safe persistence. Commands, attempts, and results must survive API restart.

## Implementation Steps

1. Create `CommandRepo` interface in command-store.ts with upsert/findByTenant/findByField/query
2. Add lazy repo variables `_cmdRepo`, `_attemptRepo`, `_resultRepo`
3. Implement `initCommandStoreRepos()` for lifecycle.ts wiring
4. Implement `rehydrateCommandStore(tenantId)` to reload from PG on startup
5. Implement `persistCommand()`, `persistAttempt()`, `persistResult()` fire-and-forget helpers
6. Wire persist calls into: `createCommand()`, `updateCommandStatus()`, `setDryRunTranscript()`, `recordAttempt()`, `recordResult()`
7. Create `w41-durable-repos.ts` with factory functions for all W41 repos
8. Add W41 wiring block to lifecycle.ts

## Files Touched

- apps/api/src/writeback/command-store.ts (PG wiring infra + persist calls)
- apps/api/src/platform/pg/repo/w41-durable-repos.ts (NEW - 10 factory functions)
- apps/api/src/platform/pg/repo/index.ts (barrel export)
- apps/api/src/server/lifecycle.ts (W41 wiring block)

## Notes

- PG tables clinical_command, clinical_command_attempt, clinical_command_result already exist (v30)
- Write-through pattern: in-memory Map stays hot cache, PG writes are fire-and-forget
- Rehydration loads from PG on startup, skipping entries already in memory
