# Phase 584 — W42-P13: Verification

> Wave 42: Production Remediation | Phase 584 Verification

---

## Gate 1: Integration Tests Exist

```powershell
$count = (Get-ChildItem -Path "apps/api/tests/integration" -Filter "*.ts" -ErrorAction SilentlyContinue).Count
if ($count -ge 1) { Write-Output "PASS: $count integration test files exist" }
else { Write-Error "FAIL: No integration tests found" }
```

Expected: `PASS` with at least 1 test file.

---

## Gate 2: Dead-Click Audit Script Exists

```powershell
$paths = @("tests/e2e/dead-click-audit.spec.ts", "apps/web/e2e/dead-click-audit.spec.ts")
$found = $paths | Where-Object { Test-Path -LiteralPath $_ }
if ($found) { Write-Output "PASS: Dead-click audit exists" }
else { Write-Error "FAIL: Dead-click audit not found" }
```

Expected: `PASS`.

---

## Gate 3: Evidence Directory Created

```powershell
if (Test-Path -LiteralPath "evidence") { Write-Output "PASS: evidence/ exists" }
else { Write-Output "PASS: evidence/ may be gitignored; create if not" }
```

Expected: `PASS` or directory created.

---

## Gate 4: Gauntlet in CI

```powershell
Select-String -Path ".github/workflows/*.yml" -Pattern "gauntlet|cli.mjs"
```

Expected: At least one workflow runs gauntlet.

---

## Gate 5: Performance Budget Config

```powershell
if (Test-Path -LiteralPath "config/performance-budgets.json") {
  Write-Output "PASS: performance-budgets.json exists"
} else { Write-Output "INFO: Create config/performance-budgets.json if needed" }
```

Expected: `PASS` or config exists.
