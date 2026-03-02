# Phase 474 — W32-P2: Prompt Phase File-Name Standardization

## Implementation Steps

1. Create fixer script `scripts/prompts-normalize-wave-files.mjs`
   - Scans all `^\d+-W\d+-P\d+-` folders under prompts/
   - Renames `NNN-01-IMPLEMENT.md` -> `IMPLEMENT.md`
   - Renames `NNN-99-VERIFY.md` -> `VERIFY.md`
   - Renames `NNN-NOTES.md` -> `NOTES.md`
   - Windows-safe (no symlinks)
   - Dry-run mode with `--dry-run`

2. Create lint gate `scripts/qa-gates/wave-phase-lint.mjs`
   - Enforces: wave folders MUST have exactly IMPLEMENT.md, VERIFY.md, NOTES.md
   - FAILs if old-style naming found or required files missing

3. Run fixer on all existing wave folders

4. Verify with lint gate + prompts-tree-health

## Files Touched

- `scripts/prompts-normalize-wave-files.mjs` (created)
- `scripts/qa-gates/wave-phase-lint.mjs` (created)
- `prompts/*/IMPLEMENT.md` (renamed from NNN-01-IMPLEMENT.md)
- `prompts/*/VERIFY.md` (renamed from NNN-99-VERIFY.md)
- `prompts/*/NOTES.md` (renamed from NNN-NOTES.md)
