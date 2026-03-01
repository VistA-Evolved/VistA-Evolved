# Phase 303 — Pharmacy Deep Writeback (W12-P5)

## User Request
Implement the Pharmacy domain writeback executor for the Clinical Writeback Command Bus,
covering PLACE_MED_ORDER, DISCONTINUE_MED_ORDER, and ADMINISTER_MED intents.

## Implementation Steps

1. Create `apps/api/src/writeback/executors/pharm-executor.ts`
   - Implement `RpcExecutor` for PHARM domain (3 intents)
   - PLACE_MED_ORDER: ORWDX LOCK + ORWDX SAVE + ORWDXM AUTOACK + ORWDX UNLOCK
   - DISCONTINUE_MED_ORDER: ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
   - ADMINISTER_MED: integration-pending (PSB MED LOG not in sandbox)
   - LOCK/UNLOCK with finally pattern

2. Update `apps/api/src/writeback/executors/index.ts` — add pharmExecutor

3. Create contract tests: `pharm-contract.test.ts`

## Verification Steps
Run `scripts/verify-phase303-pharm-writeback.ps1` — all gates must PASS.

## Files Touched
- `apps/api/src/writeback/executors/pharm-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (MODIFIED)
- `apps/api/src/writeback/__tests__/pharm-contract.test.ts` (NEW)
