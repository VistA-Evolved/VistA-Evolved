# Phase 423 — Prompts Drift Repair + Lint Hardening — VERIFY

## Verification Gates

### Gate 1: Tree Health Linter
```powershell
node scripts/qa-gates/prompts-tree-health.mjs
```
**Expected**: Exit code 0, ≥7 PASS, 0 FAIL.

### Gate 2: Prompts Audit
```powershell
node scripts/prompts-audit.mjs
```
**Expected**: 0 collisions, 0 incomplete.

### Gate 3: Shadow Folder Check
No numbered directories under `prompts/` that are not recognized by `PHASE_FOLDER_RE`.

### Gate 4: Git Rename Integrity
```powershell
git diff --name-status HEAD -- prompts/
```
All 7 renames appear as R (rename), not D+A (delete + add).

### Gate 5: Evidence Files
Both `evidence/wave-26/423-prompts-repair/before-tree-health.txt` and
`after-tree-health.txt` exist and show PASS counts.

### Gate 6: Heading Consistency
- `263-WAVE-8-INTEGRITY-AUDIT` files do NOT contain "Phase 263" in headings.
- `290-WAVE-9-INTEGRITY-AUDIT` files do NOT contain "Phase 290" in headings.

### Gate 7: NOTES.md Added
Four new NOTES.md files exist in the 4 folders listed in IMPLEMENT.

## Exit Criteria
All gates PASS. Tree health exit code = 0. Prompt audit 0 collisions.
