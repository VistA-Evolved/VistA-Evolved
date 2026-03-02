# Phase 502 — Bug Bash Harness + Defect Registry Generator

## Objective
Create a machine-readable defect registry and a script that:
1. Scans `docs/BUG-TRACKER.md` for known bugs, extracts severity
2. Scans code for TODO/FIXME/HACK/BUG- patterns
3. Produces `artifacts/defect-registry.json` with counts per severity
4. `-Check` mode exits non-zero if P0 count > 0

## Files Changed
- `scripts/qa/bug-bash-run.ps1` — Defect registry scanner + checker
- `docs/qa/defect-budget.json` — Budget thresholds

## Verification
- `bug-bash-run.ps1` exists and runs
- `-Check` mode reads defect-budget.json and exits 0 if within budget
- Report appears in artifacts/defect-registry.json
