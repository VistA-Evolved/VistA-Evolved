# Phase 433 — Verification

## Checks
1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `types.ts` exports 7 lab inbound types
3. `store.ts` exports 8 store functions + _resetLabStore
4. `handler.ts` exports processOruR01 + getLabFilingTarget
5. `index.ts` barrel re-exports all public types and functions
6. Validation catches missing filler order number, patient ID, OBX segments
7. Auto-quarantine on validation failure
8. rpcRegistry.ts has 2 new exceptions (LRFZX, LR VERIFY)
9. No console.log statements
10. Store respects MAX_STORE_SIZE with FIFO eviction
