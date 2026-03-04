# Phase 501 — Single "RC Verify" Orchestrator + Report

## Files Changed

- `scripts/verify-rc.ps1` — RC verify orchestrator (runs all gates from RC_SCOPE.md)
- `scripts/verify-latest.ps1` — Updated to delegate to verify-rc.ps1

## Implementation Steps

1. Create verify-rc.ps1 that runs every gate from RC_SCOPE.md
2. Each gate: run command, capture exit code + duration, write to report
3. Output: evidence/wave-35/<phase>/verify-rc/output.txt + report.json
4. Update verify-latest.ps1 to call verify-rc.ps1

## Policy Decisions

- Gates run sequentially (not parallel) to avoid resource contention
- A gate that exits non-zero is FAIL; exit 0 is PASS
- If a gate binary is missing, status is SKIP (not FAIL) — avoids env-specific blocks
- Final exit code: 0 if all required gates PASS or SKIP; 1 if any FAIL
