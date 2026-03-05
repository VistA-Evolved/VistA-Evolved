# Phase 579 — W42-P8: Verification

> Wave 42: Production Remediation | Phase 579 Verification

---

## Gate 1: No "Not implemented" in Notes

```powershell
$matches = Select-String -Path "apps/api/src/routes/notes.ts" -Pattern "Not implemented"
if ($matches) { Write-Error "FAIL: $($matches.Count) Not implemented in notes" }
else { Write-Output "PASS: No Not implemented in notes" }
```

Expected: `PASS`.

---

## Gate 2: No "Not implemented" in Orders

```powershell
$matches = Select-String -Path "apps/api/src/routes/orders.ts" -Pattern "Not implemented"
if ($matches) { Write-Error "FAIL: $($matches.Count) Not implemented in orders" }
else { Write-Output "PASS: No Not implemented in orders" }
```

Expected: `PASS`.

---

## Gate 3: LOCK/UNLOCK in Order Writes

```powershell
Select-String -Path "apps/api/src/routes/orders.ts" -Pattern "ORWDX LOCK|ORWDX UNLOCK"
```

Expected: Both LOCK and UNLOCK appear in order write paths.

---

## Gate 4: RPC Registry Coverage

```powershell
.\scripts\verify-phase106-vista-alignment.ps1 2>&1 | Select-String -Pattern "Gate 3|unregistered|PASS|FAIL"
```

Expected: Gate 3 PASS for notes/orders routes.

---

## Gate 5: safeCallRpc Count

```powershell
$notes = (Select-String -Path "apps/api/src/routes/notes.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
$orders = (Select-String -Path "apps/api/src/routes/orders.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
Write-Output "Notes RPC calls: $notes (expect >= 100)"
Write-Output "Orders RPC calls: $orders (expect >= 100)"
```

Expected: At least 100 each.
