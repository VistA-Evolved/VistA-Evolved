# Phase 504 — Performance Budgets + Soak Tests

## Objective

Create a smoke-mode performance check that validates:

1. config/performance-budgets.json thresholds
2. TypeScript compile time stays within budget
3. Phase-index build time stays within budget
4. Gate script execution time stays within budget

## Files Changed

- `scripts/perf/run-soak.ps1` — Perf smoke runner
- `config/performance-budgets.json` — Updated with RC budgets

## Verification

- run-soak.ps1 -Mode smoke exits 0 when within budget
