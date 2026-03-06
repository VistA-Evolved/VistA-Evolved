# Phase 578 — W42-P7: Verification

> Wave 42: Production Remediation | Phase 578 Verification

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

## Gate 1: No "Not implemented" in Problems

```powershell
Select-String -Path "apps/api/src/routes/problems.ts" -Pattern "Not implemented|ok: false"
```

Expected: No matches; or only in catch blocks for errors, not as default return.

---

## Gate 2: No "Not implemented" in Meds

```powershell
Select-String -Path "apps/api/src/routes/meds.ts" -Pattern "Not implemented|ok: false"
```

Expected: No matches; or only in catch blocks for errors.

---

## Gate 3: RPC Registry Coverage

```powershell
.\scripts\verify-phase106-vista-alignment.ps1 2>&1 | Select-String -Pattern "Gate 3|unregistered|PASS|FAIL"
```

Expected: Gate 3 PASS or no unregistered RPC errors for problems/meds routes.

---

## Gate 4: safeCallRpc Used with DUZ

```powershell
Select-String -Path "apps/api/src/routes/problems.ts","apps/api/src/routes/meds.ts" -Pattern "safeCallRpc|safeCallRpcWithList"
```

Expected: All stub routes use safeCallRpc or safeCallRpcWithList (not raw callRpc).

---

## Gate 5: Problems + Meds Count

```powershell
$prob = (Select-String -Path "apps/api/src/routes/problems.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
$meds = (Select-String -Path "apps/api/src/routes/meds.ts" -Pattern "safeCallRpc|safeCallRpcWithList").Count
Write-Output "Problems RPC calls: $prob (expect >= 26)"
Write-Output "Meds RPC calls: $meds (expect >= 60)"
```

Expected: At least 26 and 60 respectively.
