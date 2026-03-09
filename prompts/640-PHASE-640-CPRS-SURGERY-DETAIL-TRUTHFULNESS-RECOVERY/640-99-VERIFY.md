# Phase 640 - VERIFY - CPRS Surgery Detail Truthfulness Recovery

## Verification Steps

1. Open `/cprs/chart/69/surgery` as clinician.
2. Select surgery case `10021` or another real case whose `ORWSR ONECASE` response contains a raw VistA runtime error.
3. Confirm the backend no longer returns `ok: true` with empty detail for that case.
4. Confirm the Surgery panel now shows a truthful unavailable/error state instead of a misleading “No operative note text resolved” success banner.
5. Confirm the empty-state behavior for `/cprs/chart/46/surgery` remains unchanged.

## Acceptance Criteria

1. Runtime failures from `ORWSR ONECASE` are surfaced as real failures, not empty successes.
2. `rawCase` and `rpcUsed` remain available for diagnosis.
3. The Surgery list route remains live and unchanged.
4. The Surgery panel still supports genuine resolved notes when the backend does return them.