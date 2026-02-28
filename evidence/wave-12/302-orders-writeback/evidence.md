# Phase 302 — Orders Writeback Core — Evidence

## Files Created
- `apps/api/src/writeback/executors/orders-executor.ts` (~260 lines)
- `apps/api/src/writeback/__tests__/orders-contract.test.ts` (~180 lines)

## Files Modified
- `apps/api/src/writeback/executors/index.ts` — added ordersExecutor export

## RPC Mapping (from rpcRegistry.ts)

| RPC | Domain | Type |
|-----|--------|------|
| ORWDX LOCK | orders | write |
| ORWDX UNLOCK | orders | write |
| ORWDX SAVE | orders | write |
| ORWDXA DC | orders | write |
| ORWDXA VERIFY | orders | write |
| ORWDXA FLAG | orders | write |
| ORWOR1 SIG | orders | write |

## Safety Patterns
- LOCK before write, UNLOCK in `finally`
- esCode SHA-256 hashed (16 chars) for SIGN_ORDER
- Error classification: permanent (bad params) vs transient (lock contention)
- All intents validated before RPC calls
- No PHI in logs or audit

## Contract Tests
18 test cases covering:
- 3 submission tests (mismatch, idempotency, gate check)
- 5 dry-run transcripts (one per intent)
- 5 validation tests (required fields per intent)
- 5 safety invariants (LOCK/UNLOCK, esCode, intent count, no-lock intents)

## Verifier
`scripts/verify-phase302-orders-writeback.ps1` — 12 gates
