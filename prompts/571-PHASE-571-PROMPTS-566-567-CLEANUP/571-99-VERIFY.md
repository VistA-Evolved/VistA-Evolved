# Phase 571 -- VERIFY: Rename Phase 566/567 Prompt Files

## Verification Steps

### Gate 1: Files renamed correctly
```powershell
Test-Path -LiteralPath "prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-01-IMPLEMENT.md"   # True
Test-Path -LiteralPath "prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-99-VERIFY.md"      # True
Test-Path -LiteralPath "prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/567-01-IMPLEMENT.md"   # True
Test-Path -LiteralPath "prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/567-99-VERIFY.md"      # True
```

### Gate 2: Old files removed
```powershell
-not (Test-Path -LiteralPath "prompts/566-PHASE-566-VISTA-RPC-BRIDGE/P1-1-01-IMPLEMENT.md")   # True
-not (Test-Path -LiteralPath "prompts/566-PHASE-566-VISTA-RPC-BRIDGE/P1-1-99-VERIFY.md")      # True
-not (Test-Path -LiteralPath "prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/P1-3-01-IMPLEMENT.md")   # True
-not (Test-Path -LiteralPath "prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/P1-3-99-VERIFY.md")      # True
```

### Gate 3: Headings updated
```powershell
$f566 = Get-Content "prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-01-IMPLEMENT.md" -Raw
$f566 -match 'Phase 566'   # True (not P1-1)
$f567 = Get-Content "prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/567-01-IMPLEMENT.md" -Raw
$f567 -match 'Phase 567'   # True (not P1-3)
```

### Gate 4: Internal file references updated
```powershell
$f566 -notmatch '566-PHASE-P1-1'   # True (old folder name gone)
```

### Gate 5: Phase index regenerated
```powershell
node scripts/qa-gates/phase-index-gate.mjs   # All checks PASS
```

### Gate 6: No content deleted
```powershell
$f566 -match 'VistaRpcBridge'                    # True -- content preserved
$f567 -match 'Consolidate Patient Model'         # True -- content preserved
```

## Acceptance Criteria

- [ ] All 4 files renamed from P1-x to phase-number prefix
- [ ] Headings updated from P1-x to Phase 566 / Phase 567
- [ ] Internal path references corrected
- [ ] No content deleted or modified beyond naming
- [ ] Phase index regenerated without errors
- [ ] Gauntlet fast passes
