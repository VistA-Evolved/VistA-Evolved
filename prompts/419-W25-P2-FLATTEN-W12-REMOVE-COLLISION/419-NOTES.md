# Phase 419 -- W25-P2: Flatten W12 + Remove Collisions (NOTES)

## What Changed
- Moved 15 files from `299-WAVE-12/{302..306}-*/` into top-level phase folders
  using `git mv` (preserves history)
- Removed 4 empty collision-duplicate directories:
  - `299-WAVE-12/` (emptied by flatten)
  - `308-PHASE-308-DEPT-CERTIFICATION-RUNNER` (was empty)
  - `412-W24-P4-CERT-RUNS` (was empty)
  - `415-W24-P7-CUTOVER-ROLLBACK-DR` (was empty)
- Updated `scripts/verify-phase302-orders-writeback.ps1` paths

## Before vs After
| Metric            | Before (P1 baseline) | After (P2) |
|-------------------|---------------------|------------|
| Collisions        | 4 groups            | 0          |
| Duplicate prefixes| 4                   | 0          |
| Nested subdirs    | 5 under 299-WAVE-12 | 0          |

## Pre-existing Issues (NOT in P2 scope)
- 18 orphan flat files (328-336) -- P3 will fix
- 9 phase-mismatch FAILs (280-282 folders) -- cosmetic naming mismatch
- 1 empty folder (234-PHASE-237-PROMPT-LINTER-MANIFEST) -- pre-existing
- `00-ARCHIVE` / `00-PLAYBOOKS` collision -- structural, not numeric phase
