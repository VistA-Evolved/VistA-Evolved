# Phase 276 — VERIFY: Durability Read-Through

## Gates

1. `read-through.ts` exports `readThroughGet` and `readThroughList`
2. QA gate script runs without error
3. At least 3 critical stores wired with read-through
4. `readThroughGet` returns data from PG when local Map is empty
5. TypeScript compiles cleanly
