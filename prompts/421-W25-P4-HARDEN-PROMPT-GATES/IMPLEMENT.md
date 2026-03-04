# Phase 421 -- W25-P4: Harden Prompt Gates (IMPLEMENT)

## Objective

Harden the prompts tree-health QA gate and CI workflows to:

1. Recognize `Wxx-Pxx` wave-phase naming pattern
2. FAIL (not WARN) on orphan flat files
3. Detect nested numbered subdirectories in phase folders
4. Exclude manifests/meta-files from flat-file checks
5. Add `prompts-audit.mjs` to both CI workflows

## Changes Made

### `scripts/qa-gates/prompts-tree-health.mjs`

1. **`PHASE_FOLDER_RE`**: Added `W\d+-P\d+-` pattern to match wave-phase folders
   - Before: recognized 309 folders. After: recognizes 412 folders
2. **Orphan flat files**: Changed from `warn()` to `fail()` -- drift is now a CI blocker
3. **`ALLOWED_ROOT_FILES`**: Excludes `README.md`, `PROMPTS_INDEX.md`,
   `00-ORDERING-RULES.md`, and `WAVE_*` manifest files from flat-file checks
4. **`FOLDER_CONVENTION_RE`**: Added `W\d+-P\d+-[A-Z0-9-]+` alternative
5. **Phase extraction**: All Gates (1,4,5) now try `PHASE-(\d+\w?)` first,
   fall back to `^(\d+)-W\d+-P\d+` for wave-phase folders
6. **Gate 6 (NEW): nested-phase**: Fails if any phase folder contains numbered
   subdirectories (prevents W12-style nesting from recurring)

### `.github/workflows/quality-gates.yml`

- Added `prompts-audit.mjs` step after `prompts-tree-health.mjs`

### `.github/workflows/ci-verify.yml`

- Added `prompts-audit.mjs` step after `prompts-tree-health.mjs`

## Files Touched

- `scripts/qa-gates/prompts-tree-health.mjs` (hardened)
- `.github/workflows/quality-gates.yml` (+audit step)
- `.github/workflows/ci-verify.yml` (+audit step)
