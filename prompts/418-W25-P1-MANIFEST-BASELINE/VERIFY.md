# Phase 418 — W25-P1: VERIFY

## Checks
1. `docs/qa/prompt-phase-range-reservations.json` has Wave 25 with start=418, end=422
2. `/prompts/WAVE_25_MANIFEST.md` exists and references range 418-422
3. Evidence files exist in `/evidence/wave-25/418-manifest-baseline/`
4. Baseline audit shows collisions for prefix 299
5. Baseline audit shows gaps for 328-336

## Commands
```powershell
Test-Path prompts/WAVE_25_MANIFEST.md
(Get-Content docs/qa/prompt-phase-range-reservations.json -Raw) -match '"wave":\s*"25"'
Test-Path evidence/wave-25/418-manifest-baseline/prompts-audit.before.json
Test-Path evidence/wave-25/418-manifest-baseline/prompts-tree-health.before.txt
Test-Path evidence/wave-25/418-manifest-baseline/check-ordering.before.txt
```
