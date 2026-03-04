# Wave 25 Manifest -- Prompt-System Recovery + Anti-Drift Gates + Wave 12/15 Repair

> Fix structural drift in /prompts: collisions, orphan flat files, nested phases.
> Harden CI gates so these issues cannot recur.

## Phase Map

| Wave Phase | Resolved ID | Title                                         | Prompt Folder                             | Status   |
| ---------- | ----------- | --------------------------------------------- | ----------------------------------------- | -------- |
| W25-P1     | 418         | Manifest + Range Reservation + Baseline Audit | `418-W25-P1-MANIFEST-BASELINE`            | Verified |
| W25-P2     | 419         | Flatten W12 Nested Phases + Remove Collision  | `419-W25-P2-FLATTEN-W12-REMOVE-COLLISION` | Verified |
| W25-P3     | 420         | Recover W15 Prompt Folders (328-336)          | `420-W25-P3-RECOVER-W15-FOLDERS`          | Verified |
| W25-P4     | 421         | Harden Prompt Gates (CI + Local)              | `421-W25-P4-HARDEN-PROMPT-GATES`          | Verified |
| W25-P5     | 422         | Fix verify-latest + Regenerate Prompt Index   | `422-W25-P5-VERIFY-LATEST-REINDEX`        | Verified |

## Scope

Wave 25 is a **structural repair wave** that:

1. Eliminates the duplicate prefix 299 collision (W12 nested phases)
2. Moves orphan flat files for phases 328-336 (W15) into proper folders
3. Cleans up duplicate empty folders (308, 412, 415)
4. Hardens CI/local QA gates to prevent future drift
5. Updates verify-latest and regenerates the prompt index

## Prerequisites

- Wave 24 completed (Phases 409-417)
- All existing prompt management scripts operational

## Known Issues (Pre-Wave 25)

- Prefix 299 collision: `299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX` + `299-WAVE-12`
- Orphan flat files: 328-01-IMPLEMENT.md through 336-99-VERIFY.md (18 files at root)
- Nested phases: 302-306 under `299-WAVE-12/` (should be top-level)
- Empty duplicate folders: 308, 412, 415 (empty variants alongside populated ones)
- verify-latest.ps1 points to wave23, not wave24
