# Phase 421 -- W25-P4: Harden Prompt Gates (NOTES)

## What Changed
- `prompts-tree-health.mjs` now recognizes 412 phase folders (was 309)
- Orphan flat files are now FAIL (CI blocker), not just WARN
- New `nested-phase` gate prevents W12-style nesting recurrence
- `prompts-audit.mjs` (collision detector) added to both CI workflows
- Root-level manifest files (`WAVE_*_MANIFEST.md`) excluded from flat-file check

## Before vs After
| Metric                  | Before (P3) | After (P4) |
|------------------------|-------------|------------|
| Folders recognized     | 309         | 412        |
| Orphan flat severity   | WARN        | FAIL       |
| Nested detection       | none        | Gate 6     |
| CI audit gate          | no          | yes        |
| Manifests excluded     | no          | yes        |

## Pre-existing Issues (unchanged)
- 9 phase-mismatch FAILs for 280-282 folders (internal heading/folder name mismatch)
- 1 empty folder (234-PHASE-237-PROMPT-LINTER-MANIFEST) WARN
