# Phase 417 — W24-P9: Go/No-Go Gate + Ops Runbooks — VERIFY

## Gates
1. `scripts/pilot-go-no-go.ps1` exists and passes all 27 gates
2. `docs/pilots/ops/DAY1.md` exists with hour-by-hour structure
3. `docs/pilots/ops/WEEK1.md` exists with daily/weekly check pattern
4. `docs/pilots/ops/MONTH1.md` exists with GA expansion criteria
5. Evidence JSON produced at `evidence/wave-24/417-go-nogo/`
6. Decision is "GO" for both clinic and hospital archetypes

## Verification Command
```powershell
.\scripts\pilot-go-no-go.ps1 -CustomerName demo-clinic -Archetype clinic
.\scripts\pilot-go-no-go.ps1 -CustomerName demo-hospital -Archetype hospital
```
Both must exit with code 0, decision "GO".
