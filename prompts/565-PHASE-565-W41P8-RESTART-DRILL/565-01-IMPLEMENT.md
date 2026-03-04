# Phase 565 (W41-P8): Restart Drill

## User Request

Create automated restart-drill verification script that confirms PG-backed stores survive API restart.

## Implementation Steps

1. Create scripts/restart-drill.mjs
2. Phase 1: Prerequisites — check API health endpoint
3. Phase 2: Store-policy audit — scan for pg_write_through entries, verify count
4. Phase 3: PG migration check — verify v58 migration includes all 4 new tables
5. Phase 4: Lifecycle wiring check — verify W41 block in lifecycle.ts
6. Phase 5: Repo factory check — verify w41-durable-repos.ts exports

## Files Touched

- scripts/restart-drill.mjs (new file)

## Notes

- Script uses node:fs for file reads, node:child_process for API health probes
- 5 pass/fail/skip gates with summary output
- Run with: node scripts/restart-drill.mjs
