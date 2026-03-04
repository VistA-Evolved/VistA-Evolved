# Phase 317 — W14-P1: VERIFY

## Verification Steps

### 1. Manifest maps to BASE_PHASE..BASE_PHASE+8

```powershell
# Confirm max prefix is 316
Get-ChildItem -Path prompts -Directory | ForEach-Object { if ($_.Name -match '^(\d+)-') { [int]$Matches[1] } } | Sort-Object -Descending | Select-Object -First 1
# Expected: 317 (after this phase is committed) or 316 (before)

# Confirm manifest lists phases 317-325
Select-String -Path prompts/WAVE_14_MANIFEST.md -Pattern '31[7-9]|32[0-5]'
# Expected: 9 phase rows
```

### 2. ADR files exist and are linked from manifest

```powershell
Test-Path docs/adrs/ADR-HL7-ENGINE.md
Test-Path docs/adrs/ADR-X12-LIBRARY.md
Test-Path docs/adrs/ADR-CLEARINGHOUSE-TRANSPORT.md
# Expected: all True

Select-String -Path prompts/WAVE_14_MANIFEST.md -Pattern 'ADR-HL7|ADR-X12|ADR-CLEARINGHOUSE'
# Expected: 3 matches
```

### 3. Inventory file exists

```powershell
Test-Path docs/integrations/interop-inventory.md
# Expected: True
```

### 4. Evidence saved

```powershell
Test-Path evidence/wave-14/317-manifest/manifest.md
Test-Path evidence/wave-14/317-manifest/interop-inventory.md
Test-Path evidence/wave-14/317-manifest/prompts-scan.txt
# Expected: all True
```

## Expected Gate Result

All checks pass. GATE: W14-P1 VERIFY PASSES.
