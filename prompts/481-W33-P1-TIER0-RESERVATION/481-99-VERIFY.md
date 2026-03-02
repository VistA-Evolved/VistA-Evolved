# Phase 481 — W33-P1: VERIFY

## Gates

| # | Gate | Check |
|---|------|-------|
| 1 | Manifest exists | `WAVE_33_MANIFEST.md` in `prompts/` |
| 2 | Range reserved | 481-490 in reservation file |
| 3 | Prompt folder | `481-W33-P1-TIER0-RESERVATION/` has IMPLEMENT + VERIFY + NOTES |
| 4 | Tier-0 targets doc | `docs/clinical/tier0-writeback-targets.md` exists with table |
| 5 | Tier-0 JSON inventory | `docs/qa/tier0-integration-pending.json` is valid JSON |
| 6 | Budget gate | `integration-pending-budget.mjs` passes (delta +0) |
| 7 | Phase count | `phase-index-gate.mjs` passes after rebuild |

## How to Run
```powershell
# Gate 1
Test-Path prompts/WAVE_33_MANIFEST.md
# Gate 6
node scripts/qa-gates/integration-pending-budget.mjs
# Gate 7
node scripts/build-phase-index.mjs; node scripts/qa-gates/phase-index-gate.mjs
```
