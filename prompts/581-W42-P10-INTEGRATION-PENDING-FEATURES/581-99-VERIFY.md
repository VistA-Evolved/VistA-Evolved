# Phase 581 — W42-P10: Verification

> Wave 42: Production Remediation | Phase 581 Verification

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

## Gate 1: Nursing Routes Exist

```powershell
Get-ChildItem -Path apps/api/src -Recurse -Filter "*.ts" | Select-String -Pattern "ORQQVI|nursing|flowsheet|I&O" -List | Select-Object Path -Unique
```

Expected: At least one file with nursing/flowsheet logic.

---

## Gate 2: eMAR Routes Exist

```powershell
Get-ChildItem -Path apps/api/src -Recurse -Filter "*.ts" | Select-String -Pattern "ORWPS ACTIVE|ORWPS DETAIL|emar|PSB MED LOG" -List | Select-Object Path -Unique
```

Expected: eMAR routes with ORWPS calls; PSB routes marked integration-pending.

---

## Gate 3: vistaGrounding on Integration-Pending

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "integration-pending" | ForEach-Object { $_.Line }
```

Expected: Each integration-pending response includes `vistaGrounding` metadata.

---

## Gate 4: Order Check RPCs Wired

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "ORWDXC ACCEPT|ORWDXC DISPLAY|ORWDXC SAVECHK"
```

Expected: All three ORWDXC RPCs appear in code.

---

## Gate 5: Census/Bedboard Routes

```powershell
Select-String -Path "apps/api/src" -Recurse -Pattern "ORQPT WARDS|ORQPT WARD PATIENTS|bedboard|census"
```

Expected: Census and bedboard use ORQPT RPCs.
