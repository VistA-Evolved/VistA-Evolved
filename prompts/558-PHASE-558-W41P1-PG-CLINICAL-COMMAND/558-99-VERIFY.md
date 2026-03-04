# Phase 558 (W41-P1): Verification

## Verification Steps

1. TS build clean: `pnpm -C apps/api exec tsc --noEmit`
2. command-store.ts exports: initCommandStoreRepos, rehydrateCommandStore
3. lifecycle.ts calls initCommandStoreRepos + rehydrateCommandStore
4. store-policy.ts: writeback-commands/attempts/results = pg_write_through
5. All 5 mutation functions call persist helpers

## Acceptance Criteria

- Zero TS errors
- initCommandStoreRepos wired in lifecycle.ts W41 block
- rehydrateCommandStore("default") called after init
- createCommand, updateCommandStatus, setDryRunTranscript, recordAttempt, recordResult all persist
- store-policy entries updated from in_memory_only to pg_write_through
