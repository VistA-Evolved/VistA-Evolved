# Phase 480 — W32-P8: VERIFY

## Gates

1. `scripts/qa-gates/integration-pending-budget.mjs` exists and is >80 lines
2. Script accepts `--update`, `--report`, `--tolerance` flags
3. `docs/qa/integration-pending-baseline.json` exists with `total` field
4. Baseline `total` is >= 200 (sanity check — we know there are ~292)
5. `docs/qa/integration-pending-backlog.md` exists with resolution strategy
6. Budget gate passes when run (exit 0)
7. No PHI in baseline or backlog files
8. Script handles BOM stripping (BUG-064)

## Verification
```powershell
$script = Get-Content scripts/qa-gates/integration-pending-budget.mjs -Raw
($script.Split("`n").Count) -gt 80          # Gate 1
$script -match '--update'                    # Gate 2a
$script -match '--report'                    # Gate 2b
$script -match '--tolerance'                 # Gate 2c

$base = Get-Content docs/qa/integration-pending-baseline.json -Raw | ConvertFrom-Json
$base.total -ge 200                          # Gate 3+4

Test-Path docs/qa/integration-pending-backlog.md   # Gate 5

# Gate 6: run the gate
node scripts/qa-gates/integration-pending-budget.mjs
# Should exit 0

$base.total   # Should be ~292
```
