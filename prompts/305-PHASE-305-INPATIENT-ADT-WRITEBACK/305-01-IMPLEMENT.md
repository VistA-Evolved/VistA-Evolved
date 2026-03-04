# Phase 305 — Inpatient ADT Writeback (W12-P7)

## User Request

Implement the ADT domain writeback executor for ADMIT, TRANSFER, DISCHARGE intents.
All 3 are integration-pending since DGPM write RPCs are not in the sandbox.

## Implementation Steps

1. Create `adt-executor.ts` — RpcExecutor with vistaGrounding metadata for all 3 intents
2. Update barrel — add adtExecutor
3. Create `adt-contract.test.ts` — 10 contract tests

## Files Touched

- `apps/api/src/writeback/executors/adt-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (MODIFIED)
- `apps/api/src/writeback/__tests__/adt-contract.test.ts` (NEW)
