# Phase 580 — W42-P9: Verification

> Wave 42: Production Remediation | Phase 580 Verification

---

## Verification Steps

Run the verification gates and commands documented below in order.

## Expected Output

Each gate should pass or produce a truthful blocker with concrete evidence.

## Negative Tests

Check failure paths, blockers, or integration-pending branches where applicable.

## Evidence Captured

Store command output in artifacts or the specified wave evidence location before marking the phase complete.

---

## Gate 1: No "Not implemented" in Labs

```powershell
$matches = Select-String -Path "apps/api/src/routes/labs.ts" -Pattern "Not implemented"
if ($matches) { Write-Error "FAIL: $($matches.Count) Not implemented in labs" }
else { Write-Output "PASS: No Not implemented in labs" }
```

Expected: `PASS`.

---

## Gate 2: No "Not implemented" in Reports

```powershell
$matches = Select-String -Path "apps/api/src/routes/reports.ts" -Pattern "Not implemented"
if ($matches) { Write-Error "FAIL: $($matches.Count) Not implemented in reports" }
else { Write-Output "PASS: No Not implemented in reports" }
```

Expected: `PASS`.

---

## Gate 3: RPC Registry Coverage

```powershell
.\scripts\verify-phase106-vista-alignment.ps1 2>&1 | Select-String -Pattern "Gate 3|unregistered|PASS|FAIL"
```

Expected: Gate 3 PASS for labs/reports routes.

---

## Gate 4: safeCallRpc Count

```powershell
$labs = (Select-String -Path "apps/api/src/routes/labs.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
$reports = (Select-String -Path "apps/api/src/routes/reports.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
Write-Output "Labs RPC calls: $labs (expect >= 37)"
Write-Output "Reports RPC calls: $reports (expect >= 39)"
```

Expected: At least 37 and 39 respectively.

---

## Gate 5: TypeScript Compiles

```powershell
cd apps/api; npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 5
```

Expected: No compilation errors.
