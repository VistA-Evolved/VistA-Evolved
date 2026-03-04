# 398-99-VERIFY -- Specialty Certification Runner

## Verification

### Gate 1: Script Exists

```powershell
Test-Path scripts/verify-wave22-specialty.ps1
```

### Gate 2: verify-latest.ps1 Delegates to Wave 22

```powershell
Get-Content scripts/verify-latest.ps1 | Select-String "wave22"
```

### Gate 3: Run Certification

```powershell
.\scripts\verify-wave22-specialty.ps1
```

Expected: ALL GATES PASSED

### Gate 4: Prompt Folder Complete

- `398-W22-P10-CERT-RUNNER/398-01-IMPLEMENT.md` exists
- `398-W22-P10-CERT-RUNNER/398-99-VERIFY.md` exists
- `398-W22-P10-CERT-RUNNER/398-NOTES.md` exists

## Result: PASS
