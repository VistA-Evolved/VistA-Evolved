# Phase 423 — Prompts Drift Repair + Lint Hardening (W26 P1)

## Objective

Fix all prompt-folder drift accumulated across Waves 1–25, harden the
`prompts-tree-health.mjs` linter so future drift is caught at CI time,
and capture before/after evidence.

## Changes

### Folder Renames (7 folders via `git mv`)

| Before | After | Reason |
|--------|-------|--------|
| `283-migration-templates` | `283-PHASE-283-MIGRATION-TEMPLATES` | Shadow folder → compliant |
| `284-billing-metering` | `284-PHASE-284-BILLING-METERING` | Shadow folder → compliant |
| `285-feature-flags-upgrade` | `285-PHASE-285-FEATURE-FLAGS-UPGRADE` | Shadow folder → compliant |
| `286-PROMPT-ORDERING-FIX` | `286-PHASE-286-PROMPT-ORDERING-FIX` | Shadow folder → compliant |
| `263-WAVE8-INTEGRITY-AUDIT` | `263-WAVE-8-INTEGRITY-AUDIT` | Wave-audit normalization |
| `290-WAVE9-INTEGRITY-AUDIT` | `290-WAVE-9-INTEGRITY-AUDIT` | Wave-audit normalization |
| `326-W14-INTEGRITY-AUDIT` | `326-WAVE-14-INTEGRITY-AUDIT` | Wave-audit normalization |

### Heading Fixes

- `263-WAVE-8-INTEGRITY-AUDIT`: headings no longer claim "Phase 263" (bare number only)
- `290-WAVE-9-INTEGRITY-AUDIT`: same treatment — bare number headings

### NOTES.md Additions

Added `NOTES.md` to 4 folders that lacked them:
- `263-WAVE-8-INTEGRITY-AUDIT/263-NOTES.md`
- `286-PHASE-286-PROMPT-ORDERING-FIX/286-NOTES.md`
- `290-WAVE-9-INTEGRITY-AUDIT/290-NOTES.md`
- `326-WAVE-14-INTEGRITY-AUDIT/326-NOTES.md`

### File Renames Inside 290

- `AUDIT-01-IMPLEMENT.md` → `290-01-IMPLEMENT.md`
- `AUDIT-99-VERIFY.md` → `290-99-VERIFY.md`

### Linter Hardening (`scripts/qa-gates/prompts-tree-health.mjs`)

- **Gate 7 (NEW)**: Shadow-folder detection — FAIL on any numbered dir not
  matching `PHASE_FOLDER_RE`.
- **Gate 8 (NEW)**: NOTES.md presence — WARN only (328 legacy gaps).
- `PHASE_FOLDER_RE` expanded: added `WAVE-\d+-` pattern for wave-level audits.
- `FOLDER_CONVENTION_RE` expanded: added `WAVE-\d+-[A-Z0-9-]+` pattern.

### Collision Resolution

| Phase | Collision | Resolution |
|-------|-----------|------------|
| 263 | `260-PHASE-263` vs `263-PHASE-263` | Moved 263 to `WAVE-8` naming (no PHASE claim) |
| 290 | `297-PHASE-290` vs `290-PHASE-290` | Moved 290 to `WAVE-9` naming (no PHASE claim) |
| 283 | `281-PHASE-283` vs `283-PHASE-283` | Legacy structural — WARN only |
| 284 | `282-PHASE-284` vs `284-PHASE-284` | Legacy structural — WARN only |

## Known Residual WARNs

- **duplicate-phase 283/284**: Legacy numbering where prefix ≠ PHASE-id.
  The 300+ legacy folders use this architecture by design.
- **notes-present**: 328 legacy folders missing NOTES.md. Progressive fix only.

## Files Touched

- `scripts/qa-gates/prompts-tree-health.mjs` (linter)
- `docs/qa/prompt-phase-range-reservations.json` (W27/W28 ranges)
- 7 folder renames under `prompts/`
- 4 new NOTES.md files
- 2 file renames inside `prompts/290-WAVE-9-INTEGRITY-AUDIT/`
- Heading edits in 263/290 audit files
