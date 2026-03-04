# Phase 422 -- W25-P5: Fix verify-latest + Regenerate Prompt Index + Final Re-Audit (VERIFY)

## Verification Gates

### Gate 1: verify-latest points to wave24

- `verify-latest.ps1` contains `verify-wave24-pilots.ps1`

### Gate 2: prompts-index.mjs exists and runs

- Script exists at `scripts/prompts-index.mjs`
- Generates `prompts/PROMPTS_INDEX.md` with 420+ entries

### Gate 3: PROMPTS_INDEX.md is current

- Contains 420+ folders
- Includes phases up to 422

### Gate 4: Final audit -- 0 collisions

- `prompts-audit.mjs` reports `Collisions: 0`

### Gate 5: Final audit -- 0 orphan flat files

- `prompts-tree-health.mjs` orphan-flat gate is PASS

### Gate 6: Final audit -- no new failures vs baseline

- All FAIL items are pre-existing (280-282 mismatch only)
- No W25 regressions

### Gate 7: WAVE_25_MANIFEST.md updated

- All 5 phases show "Verified" status

## Evidence

- `evidence/wave-25/422-final-audit/prompts-audit.final.txt`
- `evidence/wave-25/422-final-audit/prompts-tree-health.final.txt`
- `evidence/wave-25/422-final-audit/check-ordering.final.txt`
