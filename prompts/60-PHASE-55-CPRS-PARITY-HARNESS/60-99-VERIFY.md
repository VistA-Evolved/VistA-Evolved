# Phase 55 -- CPRS Parity Harness v2 (VERIFY)

## Verification Gates

### G55-1: Extraction scripts run

- extractDelphiRpcs.ts produces /artifacts/cprs/delphi-rpcs.json
- extractDelphiActions.ts produces /artifacts/cprs/delphi-actions.json
- extractDelphiForms.ts produces /artifacts/cprs/delphi-forms.json

### G55-2: Parity matrix builds

- buildParityMatrix.ts produces /artifacts/cprs/parity-matrix.json + parity-summary.txt
- Matrix cross-references Vivian + actionRegistry

### G55-3: Gating script runs

- checkCprsParity.ts exits 0 (no core dead clicks)

### G55-4: Artifacts not committed

- /artifacts/cprs/\* gitignored

### G55-5: Verifier passes

- scripts/verify-phase55-cprs-parity.ps1 exits 0

## Run

```powershell
.\scripts\verify-phase55-cprs-parity.ps1
```
