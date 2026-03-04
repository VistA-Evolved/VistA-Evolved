# Phase 302 — Orders Writeback Core (W12-P4)

## User Request

Implement the Orders domain writeback executor for the Clinical Writeback Command Bus,
covering PLACE_ORDER, DISCONTINUE_ORDER, VERIFY_ORDER, SIGN_ORDER, and FLAG_ORDER intents.

## Implementation Steps

1. Create `apps/api/src/writeback/executors/orders-executor.ts`
   - Implement `RpcExecutor` for ORDERS domain (5 intents)
   - Map intents to RPCs: ORWDX LOCK/SAVE/UNLOCK, ORWDXA DC/FLAG/VERIFY, ORWOR1 SIG
   - LOCK before write, always UNLOCK (even on error) — same pattern as TIU
   - Hash esCode with SHA-256 for SIGN_ORDER (never store raw)
   - Validate required fields per intent
   - Classify errors as permanent vs transient

2. Update `apps/api/src/writeback/executors/index.ts`
   - Re-export `ordersExecutor`

3. Create `apps/api/src/writeback/__tests__/orders-contract.test.ts`
   - 18 contract tests covering submission, dry-run, validation, and safety

## Verification Steps

Run `scripts/verify-phase302-orders-writeback.ps1` — all gates must PASS.

## Files Touched

- `apps/api/src/writeback/executors/orders-executor.ts` (NEW)
- `apps/api/src/writeback/executors/index.ts` (MODIFIED)
- `apps/api/src/writeback/__tests__/orders-contract.test.ts` (NEW)
- `prompts/299-WAVE-12/302-ORDERS-WRITEBACK/302-01-IMPLEMENT.md` (NEW)
- `prompts/299-WAVE-12/302-ORDERS-WRITEBACK/302-99-VERIFY.md` (NEW)
- `prompts/299-WAVE-12/302-ORDERS-WRITEBACK/302-NOTES.md` (NEW)
- `evidence/wave-12/302-orders-writeback/evidence.md` (NEW)
- `scripts/verify-phase302-orders-writeback.ps1` (NEW)
