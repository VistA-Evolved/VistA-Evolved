# Phase 565 (W41-P8): Verify Restart Drill

## Verification Steps
1. scripts/restart-drill.mjs exists and is executable via node
2. Script runs 5 phases: prerequisites, store-policy, PG migration, lifecycle, repo factory
3. Script exits 0 when all gates pass (structural checks)
4. Script produces clear PASS/FAIL/SKIP output per gate

## Pass Criteria
- `node scripts/restart-drill.mjs` exits 0
- All 5 phases produce PASS or SKIP (no FAIL)
- Script validates all W41 structural requirements without needing live PG
