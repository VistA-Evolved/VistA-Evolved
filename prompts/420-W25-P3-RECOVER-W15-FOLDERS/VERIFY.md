# Phase 420 -- W25-P3: Recover W15 Prompt Folders (VERIFY)

## Verification Gates

### Gate 1: No orphan flat files for 328-336
- Zero files matching `^3(2[89]|3[0-6])-*.md` at `prompts/` root

### Gate 2: All 9 folders exist with content
- Each of 328-336 has a folder with 2+ files

### Gate 3: Folder names match W15 manifest
- Folder names match the manifest's `Prompt Folder` column exactly

### Gate 4: prompts-tree-health orphan warnings resolved
- `prompts-tree-health.mjs` shows 0 orphan-flat WARNs for 328-336

### Gate 5: Gap 328-336 no longer reported
- `prompts-audit.mjs` no longer reports 328-336 in gaps list

## Evidence
- `evidence/wave-25/420-recover-w15/prompts-audit.after.txt`
- `evidence/wave-25/420-recover-w15/prompts-tree-health.after.txt`
