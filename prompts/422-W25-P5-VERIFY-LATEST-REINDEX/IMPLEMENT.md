# Phase 422 -- W25-P5: Fix verify-latest + Regenerate Prompt Index + Final Re-Audit (IMPLEMENT)

## Objective

1. Update `verify-latest.ps1` from wave23 to wave24
2. Create `scripts/prompts-index.mjs` indexer
3. Regenerate `prompts/PROMPTS_INDEX.md` covering all 420+ folders
4. Run comprehensive final audit and capture evidence

## Implementation Steps

### Step 1: Update verify-latest.ps1

- Changed delegate from `verify-wave23-hie.ps1` to `verify-wave24-pilots.ps1`

### Step 2: Create prompts-index.mjs

- Scans all prompt folders, extracts phase numbers
- Handles both `PHASE-NN` and `Wxx-Pxx` naming patterns
- Outputs markdown table to `prompts/PROMPTS_INDEX.md`

### Step 3: Regenerate PROMPTS_INDEX.md

- Old: 293 folders (stale, ended at ~folder 99)
- New: 421+ folders (complete coverage)

### Step 4: Final re-audit

- `prompts-audit.mjs`: 0 collisions, 2 gaps (48, 178 -- pre-existing)
- `prompts-tree-health.mjs`: 5 PASS, 2 WARN (234 empty, 422 empty), 9 FAIL (280-282 pre-existing)
- `check-prompts-ordering.ts`: no-duplicate-prefixes PASS, folder-naming PASS

### Step 5: Update WAVE_25_MANIFEST.md status

## Files Touched

- `scripts/verify-latest.ps1` (wave23 -> wave24)
- `scripts/prompts-index.mjs` (NEW)
- `prompts/PROMPTS_INDEX.md` (regenerated)
- `prompts/WAVE_25_MANIFEST.md` (status updated)
