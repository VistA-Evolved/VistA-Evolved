# Phase 480 — W32-P8: Integration-Pending Budget Gate

## Goal
Create a CI-ready gate that counts `integration-pending` occurrences in the
API source and fails if the count increases beyond the committed baseline.
Prevents integration debt from growing silently.

## Implementation Steps

1. **Create `scripts/qa-gates/integration-pending-budget.mjs`**:
   - Walks `apps/api/src/` for `.ts`/`.tsx` files
   - Counts `integration-pending` pattern occurrences (case-insensitive)
   - Compares against `docs/qa/integration-pending-baseline.json`
   - `--update`: regenerate baseline
   - `--report`: per-file breakdown
   - `--tolerance N`: allow N more before failing
   - Exit 0/1/2

2. **Generate baseline** (`docs/qa/integration-pending-baseline.json`):
   - 292 occurrences across 69 files at time of creation
   - Includes per-file counts for diff analysis

3. **Create backlog** (`docs/qa/integration-pending-backlog.md`):
   - Top files by count
   - Resolution strategy
   - Reduction targets

## Files Created
- `scripts/qa-gates/integration-pending-budget.mjs` — budget gate script
- `docs/qa/integration-pending-baseline.json` — committed baseline
- `docs/qa/integration-pending-backlog.md` — debt backlog

## Design Decisions
- Pattern: `integration[._-]pending` (matches all variants)
- BOM stripping for PowerShell-generated JSON (BUG-064 safe)
- Shows new files and grown files on failure for easy triage
