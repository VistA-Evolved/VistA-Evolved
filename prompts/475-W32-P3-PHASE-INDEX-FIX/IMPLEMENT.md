# Phase 475 — W32-P3: Fix Phase Index Gate Freshness

## Implementation Steps

1. Fix `scripts/build-phase-index.mjs` to discover ALL folder styles
   - Legacy: `NNN-PHASE-NNN-TITLE`
   - Wave: `NNN-W##-P##-TITLE`
   - Integrity audit: `NNN-WAVE-##-TITLE`
2. Fix `scripts/qa-gates/phase-index-gate.mjs` matching filter
3. Regenerate `docs/qa/phase-index.json`
4. Regenerate QA specs via `scripts/generate-phase-qa.mjs`
5. Update manifest status

## Files Touched

- `scripts/build-phase-index.mjs` (fixed folder regex)
- `scripts/qa-gates/phase-index-gate.mjs` (fixed folder regex)
- `docs/qa/phase-index.json` (regenerated)
