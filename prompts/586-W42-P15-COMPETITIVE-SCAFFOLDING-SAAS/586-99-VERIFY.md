# Phase 586 — W42-P15: Verification

> Wave 42: Production Remediation | Phase 586 Verification

---

## Gate 1: e-Prescribing Module Exists

```powershell
$paths = @("apps/api/src/pharmacy/erx", "apps/api/src/pharmacy/erx/message-builder.ts")
$found = $paths | Where-Object { Test-Path -LiteralPath $_ }
if ($found) { Write-Output "PASS: e-Prescribing module exists" }
else { Write-Error "FAIL: e-Prescribing module not found" }
```

Expected: `PASS`.

---

## Gate 2: Tenant Provisioning Endpoint

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "tenants/provision|tenant-provisioning"
```

Expected: At least one route or handler for tenant provisioning.

---

## Gate 3: Load Test Scenarios Exist

```powershell
$loadTests = (Get-ChildItem -Path "tests/k6" -Filter "load-*.js" -ErrorAction SilentlyContinue).Count
if ($loadTests -ge 2) { Write-Output "PASS: $loadTests load test scenarios" }
else { Write-Error "FAIL: Expected 2+ load scenarios, found $loadTests" }
```

Expected: `PASS` with at least 2 load scenarios.

---

## Gate 4: Bed Management or ED Track Board

```powershell
$paths = @("apps/api/src/inpatient/bed-management.ts", "apps/api/src/service-lines/ed/track-board.ts")
$found = $paths | Where-Object { Test-Path -LiteralPath $_ }
if ($found) { Write-Output "PASS: Bed management or ED track board exists" }
else { Write-Error "FAIL: Neither found" }
```

Expected: `PASS`.

---

## Gate 5: Billing/Lago Wiring

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "billing/usage|billing/invoices|Lago|lago"
```

Expected: At least one billing or Lago reference.
