# Phase 248 -- Verification Steps

## Verification Steps

1. Run entry gate script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/wave7-entry-gate.ps1
   ```
2. Confirm it detects current max prompt phase id (>= 244/247)
3. Confirm it shows all 9 planned Wave 7 phases
4. Confirm it fails loudly if prompt structure is missing
5. Confirm evidence directories exist

## Acceptance Criteria

- Entry gate script exits 0 with all PASS gates
- Wave 7 manifest lists 9 phases with status Planned
- Build-vs-buy ledger exists with OSS tool selections
- Evidence directories for P1-P9 exist under evidence/wave-7/
- Evidence captured: `evidence/wave-7/P1/wave7-gate.txt`

## Commands

```powershell
# Run entry gate
powershell -ExecutionPolicy Bypass -File scripts/wave7-entry-gate.ps1

# Capture evidence
powershell -ExecutionPolicy Bypass -File scripts/wave7-entry-gate.ps1 | Tee-Object evidence/wave-7/P1/wave7-gate.txt
```

## Evidence

- `/evidence/wave-7/P1/wave7-gate.txt` -- entry gate output
- `/evidence/wave-7/P1/repo-scan.txt` -- existing tools/features detected
