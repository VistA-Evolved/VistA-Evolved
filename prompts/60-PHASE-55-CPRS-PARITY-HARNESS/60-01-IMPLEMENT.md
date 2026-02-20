# Phase 55 -- CPRS Parity Harness v2 (RPC + Action + Form Extraction) + Coverage Gates (IMPLEMENT)

## Mission
Turn Delphi CPRS reference code into an enforceable parity contract for the web UI.

## Definition of Done
1. Delphi extraction produces delphi-rpcs.json, delphi-actions.json, delphi-forms.json
2. Parity matrix built against Vivian, rpc-catalog, actionRegistry
3. Gate script fails CI if core actions have dead clicks or missing mappings
4. All outputs in /artifacts/cprs/ (not committed)

## Implementation

### A) Extraction Scripts
- scripts/cprs/extractDelphiRpcs.ts
- scripts/cprs/extractDelphiActions.ts
- scripts/cprs/extractDelphiForms.ts

### B) Parity Matrix
- scripts/cprs/buildParityMatrix.ts
- Output: /artifacts/cprs/parity-matrix.json + parity-summary.txt

### C) Gating Script
- scripts/governance/checkCprsParity.ts
- scripts/cprs/core-actions.json

### D) Verifier
- scripts/verify-phase55-cprs-parity.ps1

## Files Touched
- prompts/60-PHASE-55-CPRS-PARITY-HARNESS/ (new)
- scripts/cprs/ (new, 5 files)
- scripts/governance/checkCprsParity.ts (new)
- scripts/verify-phase55-cprs-parity.ps1 (new)
- scripts/verify-latest.ps1 (updated)
