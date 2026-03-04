# Phase 418 — W25-P1: Manifest + Range Reservation + Baseline Audit

## What was done

1. Computed BASE_PHASE = 418 via `node scripts/prompts-next-phase.mjs`
2. Reserved range 418-422 via `node scripts/prompts-reserve-range.mjs --wave 25 --count 5`
3. Created `/prompts/WAVE_25_MANIFEST.md` with all 5 phase IDs
4. Captured baseline audit snapshots into `/evidence/wave-25/418-manifest-baseline/`

## Files touched

- `docs/qa/prompt-phase-range-reservations.json` — W25 entry added
- `prompts/WAVE_25_MANIFEST.md` — created
- `prompts/418-W25-P1-MANIFEST-BASELINE/` — this folder

## Baseline findings

- 4 collision groups (299, 308, 412, 415)
- 18 orphan flat files (328-336 IMPLEMENT/VERIFY)
- 11 incomplete folders (missing IMPLEMENT/VERIFY)
- 9 phase mismatches (280-282 internal heading vs folder)
- 11 gap ranges
