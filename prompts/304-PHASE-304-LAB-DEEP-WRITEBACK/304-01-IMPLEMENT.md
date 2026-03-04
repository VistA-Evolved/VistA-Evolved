# Phase 304 — Lab Deep Writeback (W12-P6)

## User Request

Implement the Lab domain writeback executor covering PLACE_LAB_ORDER and ACK_LAB_RESULT.

## Implementation Steps

1. Create `apps/api/src/writeback/executors/lab-executor.ts` — RpcExecutor for 2 LAB intents
2. Update executors barrel — add labExecutor
3. Create `lab-contract.test.ts` — 11 contract tests

## Files Touched

- `apps/api/src/writeback/executors/lab-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (MODIFIED)
- `apps/api/src/writeback/__tests__/lab-contract.test.ts` (NEW)
