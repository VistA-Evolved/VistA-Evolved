# Phase 557 — RC Gates Command — VERIFY

## Verification Steps

1. Confirm `scripts/qa-rc.mjs` exists and is executable via Node.
2. Confirm `package.json` contains `"qa:rc": "node scripts/qa-rc.mjs"`.
3. Run `pnpm qa:rc` — expect all 9 gates to pass.
4. Confirm `artifacts/qa-rc-evidence.json` is written after the run.
5. Validate the evidence JSON structure: array of 9 objects, each with
   `gate`, `passed` (boolean), `durationMs` (number).
6. Run `pnpm qa:rc` a second time to verify idempotency (same results).
7. Confirm exit code is 0 when all gates pass.

## Expected Output

```
[qa:rc] Running 9 gates...
  G1 prompts-tree-health       PASS (Nms)
  G2 wave-phase-lint            PASS (Nms)
  G3 prompts-quality-gate       PASS (Nms)
  G4 secret-scan                PASS (Nms)
  G5 phi-leak-scan              PASS (Nms)
  G6 rpc-trace-compare          PASS (Nms)
  G7 integration-pending-budget PASS (Nms)
  G8 i18n-coverage-gate         PASS (Nms)
  G9 no-hardcoded-localhost     PASS (Nms)
[qa:rc] 9/9 passed
```

## Negative Tests

- If a gate script is missing or renamed, `qa-rc.mjs` should report FAIL for
  that gate and exit 1 overall.
- If a gate times out (>60s), it should be marked FAIL with a timeout note.
- Manually introducing a violation (e.g., adding `localhost:3001` to a source
  file) should cause the corresponding gate to fail on next run.

## Evidence Captured

- `pnpm qa:rc` output showing 9/9 pass.
- `artifacts/qa-rc-evidence.json` with per-gate results.
