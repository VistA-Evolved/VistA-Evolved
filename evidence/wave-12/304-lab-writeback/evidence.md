# Phase 304 — Lab Deep Writeback — Evidence

## Files Created
- `apps/api/src/writeback/executors/lab-executor.ts` (~170 lines)
- `apps/api/src/writeback/__tests__/lab-contract.test.ts` (~100 lines)

## Files Modified
- `apps/api/src/writeback/executors/index.ts` — added labExecutor export

## RPC Mapping
| RPC | Domain | Type |
|-----|--------|------|
| ORWDX LOCK/SAVE/UNLOCK | orders | write |
| ORWLRR ACK | labs | write |

## Contract Tests: 11 cases (submission, dry-run, validation, safety)
