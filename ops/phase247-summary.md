# Phase 247 — Wave 6 Certification Suite (Summary)

## What Changed

- Created wave-level certification verifier (`scripts/verify-wave6-certification.ps1`)
  that runs all 7 phase verifiers (P3-P9) plus static checks for P1/P2
- Created wave certification snapshot (`docs/waves/wave6-certification-snapshot.md`)
  with completion table, metrics, verifier results, and known gaps
- Updated `docs/waves/WAVE6-MANIFEST.md` with commit SHAs and DONE status
- Updated `scripts/verify-latest.ps1` to delegate to wave6 certification

## How to Test Manually

```powershell
# Run the full wave certification
powershell -ExecutionPolicy Bypass -File scripts/verify-wave6-certification.ps1 -Verbose

# Or run verify-latest.ps1
.\scripts\verify-latest.ps1
```

## Verifier Output

- 7 phase verifiers: all PASS
- Wave-level gates: all PASS
- Total: ~17 gates PASS / 0 FAIL

## Follow-ups

- Wire HL7v2 engine to VistA HL7 Listener when available
- Add standalone P1/P2 verifiers if needed
- Connect export purge to lifecycle shutdown
