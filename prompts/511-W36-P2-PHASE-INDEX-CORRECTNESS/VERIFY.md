# Phase 511 -- Phase Index Builder Correctness (VERIFY)

## Gate

```powershell
node scripts/build-phase-index.mjs 2>&1 | Tee-Object evidence/wave-36/511-W36-P2-PHASE-INDEX-CORRECTNESS/phase-index-build.txt
node scripts/qa-gates/phase-index-gate.mjs 2>&1 | Tee-Object evidence/wave-36/511-W36-P2-PHASE-INDEX-CORRECTNESS/phase-index-gate.txt
```

## Expected

- Index includes wave-style folders (count matches folder count)
- Gate passes with 0 FAIL
- Known legacy duplicates listed as warnings, no new duplicates
