# Phase 419 -- W25-P2: Flatten W12 + Remove Collisions (IMPLEMENT)

## Objective
Flatten the nested Wave 12 phase folders (302-306) from `299-WAVE-12/` into
their existing top-level counterparts, and remove all empty collision-duplicate
folders.

## Pre-Conditions
- P1 (418) committed with baseline evidence showing 4 collision groups
- Nested phases: `299-WAVE-12/{302,303,304,305,306}-*` contain actual content
- Top-level `302-306` folders are empty shells
- Empty duplicate folders: `308-PHASE-308-DEPT-CERTIFICATION-RUNNER`,
  `412-W24-P4-CERT-RUNS`, `415-W24-P7-CUTOVER-ROLLBACK-DR`

## Implementation Steps

### Step 1: Flatten W12 nested phases (302-306)
- `git mv` all files from `299-WAVE-12/302-ORDERS-WRITEBACK/*.md` into 
  `302-PHASE-302-ORDERS-WRITEBACK-CORE/`
- Repeat for 303-306

### Step 2: Remove empty collision directories
- Remove `299-WAVE-12/` (now empty after flatten)
- Remove `308-PHASE-308-DEPT-CERTIFICATION-RUNNER` (empty duplicate)
- Remove `412-W24-P4-CERT-RUNS` (empty duplicate)
- Remove `415-W24-P7-CUTOVER-ROLLBACK-DR` (empty duplicate)

### Step 3: Update script references
- Fix `scripts/verify-phase302-orders-writeback.ps1` lines 16-18:
  old path `prompts/299-WAVE-12/302-ORDERS-WRITEBACK/`
  new path `prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/`

### Step 4: Verify
- Run `prompts-audit.mjs` -- expect 0 collisions
- Run `prompts-tree-health.mjs` -- expect no new failures
- Run `check-prompts-ordering.ts` -- expect no-duplicate-prefixes PASS

## Files Touched
- `prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE/` (received 3 files)
- `prompts/303-PHASE-303-PHARMACY-DEEP-WRITEBACK/` (received 3 files)
- `prompts/304-PHASE-304-LAB-DEEP-WRITEBACK/` (received 3 files)
- `prompts/305-PHASE-305-INPATIENT-ADT-WRITEBACK/` (received 3 files)
- `prompts/306-PHASE-306-IMAGING-PACS-VALIDATION/` (received 3 files)
- `prompts/299-WAVE-12/` (REMOVED)
- `prompts/308-PHASE-308-DEPT-CERTIFICATION-RUNNER/` (REMOVED)
- `prompts/412-W24-P4-CERT-RUNS/` (REMOVED)
- `prompts/415-W24-P7-CUTOVER-ROLLBACK-DR/` (REMOVED)
- `scripts/verify-phase302-orders-writeback.ps1` (path update)
