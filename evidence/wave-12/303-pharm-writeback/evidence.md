# Phase 303 — Pharmacy Deep Writeback — Evidence

## Files Created
- `apps/api/src/writeback/executors/pharm-executor.ts` (~210 lines)
- `apps/api/src/writeback/__tests__/pharm-contract.test.ts` (~140 lines)

## Files Modified
- `apps/api/src/writeback/executors/index.ts` — added pharmExecutor export

## RPC Mapping

| RPC | Domain | Type | Notes |
|-----|--------|------|-------|
| ORWDX LOCK | orders | write | Patient lock for med orders |
| ORWDX UNLOCK | orders | write | Patient unlock |
| ORWDX SAVE | orders | write | Save med order |
| ORWDXM AUTOACK | medications | write | Quick-order auto-acknowledge |
| ORWDXA DC | orders | write | Discontinue med order |
| PSB MED LOG | BCMA | write | Sandbox-absent, integration-pending |

## Contract Tests
14 test cases covering submission, dry-run (3 intents), validation, safety.
