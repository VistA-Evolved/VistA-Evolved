# Phase 286 — Prompt Ordering Collision Fix + Index Regeneration (IMPLEMENT)

## Goal
Eliminate prompt folder-prefix collisions so filesystem sort and tooling cannot
execute or index phases out of order.

## Implementation Steps

1. Create `scripts/prompts-audit.mjs`:
   - Scans prompts/ for duplicate numeric prefixes
   - Detects gaps in prefix sequence
   - Outputs machine-readable JSON report
   - Exit code 1 if collisions found

2. Run audit tool to capture "before" state with 7 collisions across 4 groups:
   - prefix 99: 5 folders (99, 99B, 99C, 99D, 99E)
   - prefix 100: 2 folders (100, 100B)
   - prefix 101: 2 folders (101, 101B)
   - prefix 115: 2 folders (115, 115B)

3. Rename collision folders to unique numeric prefixes 287-293:
   - 99B → 287, 99C → 288, 99D → 289, 99E → 290
   - 100B → 291, 101B → 292, 115B → 293

4. Run audit tool to capture "after" state: zero collisions

5. Generate `prompts/PROMPTS_INDEX.md` with sorted phase table

## Files Touched
- `scripts/prompts-audit.mjs` (NEW)
- `prompts/PROMPTS_INDEX.md` (NEW)
- `prompts/WAVE_11_MANIFEST.md` (NEW)
- 7 folder renames in `prompts/` (14 files moved)
- `evidence/wave-11/286/before.json`
- `evidence/wave-11/286/after.json`
- `evidence/wave-11/286/rename-map.json`
