# Phase 420 -- W25-P3: Recover W15 Prompt Folders (IMPLEMENT)

## Objective

Move 18 orphan flat files (328-336 IMPLEMENT/VERIFY) from `prompts/` root
into proper W15 phase folders matching WAVE_15_MANIFEST.md.

## Pre-Conditions

- 18 orphan flat files at `prompts/` root: `328-01-IMPLEMENT.md` through
  `336-99-VERIFY.md`
- W15 manifest defines folders: `328-W15-P2-MULTI-CLUSTER-REGISTRY` through
  `336-W15-P10-SCALE-CERT-RUNNER`
- P1 (327) folder already exists

## Implementation Steps

### Step 1: Create 9 phase folders

Create folders for 328-336 matching the manifest:

- `328-W15-P2-MULTI-CLUSTER-REGISTRY`
- `329-W15-P3-GLOBAL-ROUTING`
- `330-W15-P4-DATA-PLANE-SHARDING`
- `331-W15-P5-QUEUE-CACHE-REGIONAL`
- `332-W15-P6-COST-ATTRIBUTION`
- `333-W15-P7-DR-GAMEDAYS`
- `334-W15-P8-SCALE-PERF`
- `335-W15-P9-SRE-SUPPORT`
- `336-W15-P10-SCALE-CERT-RUNNER`

### Step 2: Move orphan flat files

For each phase 328-336:

- `git mv prompts/N-01-IMPLEMENT.md prompts/N-FOLDER/N-01-IMPLEMENT.md`
- `git mv prompts/N-99-VERIFY.md prompts/N-FOLDER/N-99-VERIFY.md`

### Step 3: Verify

- No orphan flat files remain at prompts/ root for 328-336
- All 9 folders have 2 files each
- `prompts-tree-health.mjs` orphan-flat warnings drop from 18 to 0

## Files Touched

- 9 new folders in `prompts/`
- 18 files moved via `git mv` (preserves history)
