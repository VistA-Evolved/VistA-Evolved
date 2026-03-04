# Phase 422 -- W25-P5: Fix verify-latest + Regenerate Prompt Index + Final Re-Audit (NOTES)

## What Changed

- `verify-latest.ps1` now delegates to `verify-wave24-pilots.ps1` (was wave23)
- New `scripts/prompts-index.mjs` generates a complete PROMPTS_INDEX.md
- PROMPTS_INDEX.md regenerated: 293 -> 421+ folders
- Final audit captured as evidence

## Wave 25 Summary -- Before vs After

| Metric               | Before (P1 baseline) | After (P5 final)  |
| -------------------- | -------------------- | ----------------- |
| Collisions           | 4 groups             | 0                 |
| Orphan flat files    | 18                   | 0                 |
| Nested subdirs       | 5 (in 299-WAVE-12)   | 0                 |
| Folders recognized   | 309                  | 414               |
| Orphan detection     | WARN                 | FAIL (CI blocker) |
| CI audit gate        | no                   | yes (both YMLs)   |
| verify-latest target | wave23               | wave24            |
| PROMPTS_INDEX.md     | 293 folders (stale)  | 421+ (current)    |
| Gaps in sequence     | 11 (incl 328-336)    | 2 (48, 178)       |

## Pre-existing Issues (not in W25 scope)

- 9 phase-mismatch FAILs for folders 280-282 (internal heading != folder name)
- 1 empty folder: 234-PHASE-237-PROMPT-LINTER-MANIFEST
- 00-ARCHIVE / 00-PLAYBOOKS prefix collision (structural, intentional)
