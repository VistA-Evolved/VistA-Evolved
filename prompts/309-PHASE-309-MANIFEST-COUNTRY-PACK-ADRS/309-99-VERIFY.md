# Phase 309 — VERIFY: Manifest + Country-Pack ADRs + Market Matrix

> Wave 13–P1 verification gates

## Gates

| # | Gate | Check |
|---|------|-------|
| 1 | WAVE_13_MANIFEST exists | `prompts/WAVE_13_MANIFEST.md` exists and contains 8 phases |
| 2 | Country Pack Standard | `docs/country-packs/COUNTRY_PACK_STANDARD.md` exists with schema |
| 3 | ADR-country-pack-model | `docs/adrs/ADR-country-pack-model.md` exists with Decision section |
| 4 | ADR-data-residency-model | `docs/adrs/ADR-data-residency-model.md` exists with Decision section |
| 5 | ADR-terminology-model | `docs/adrs/ADR-terminology-model.md` exists with Decision section |
| 6 | Target Markets Matrix | `docs/market/target-markets.md` has US, PH, GH sections |
| 7 | No legal advice | No file contains "legal advice" or "this constitutes" |
| 8 | Schema completeness | Country pack standard mentions all required sections |
| 9 | Cross-references | ADRs reference each other correctly |
| 10 | Prompts complete | IMPLEMENT + VERIFY + NOTES exist for phase 309 |
| 11 | Evidence exists | `evidence/wave-13/309-*/evidence.md` exists |

## Run

```powershell
.\scripts\verify-phase309-manifest-country-pack-adrs.ps1
```
