# Phase 274 — Prompt System Canonicalization & De-dup

> META-RULES: Treat /prompts as source of truth. No phase may be split across folders. No duplicate folder numeric prefixes. Every phase must produce code changes + updated prompts. No placeholders.

## User Request

Make prompts self-consistent, ordered, and enforceable. Audit and fix all prompt directory issues.

## Implementation Steps

1. Write `scripts/qa/prompts-canonical-audit.mjs`:
   - List duplicate folder prefixes
   - List duplicate phase numbers
   - List missing implement/verify per phase
   - List flat-files in /prompts root that should be playbooks
   - Output JSON to `artifacts/prompts-canonical-audit.json`
   - Output markdown to `docs/audits/prompts-canonical-audit.md`

2. Fix duplicate folder numeric prefixes:
   - Prefix 99: 4 folders → fix 3 duplicates (99B, 99C, 99D)
   - Prefix 100: 2 folders → fix 1 duplicate (100B)
   - Prefix 101: 2 folders → fix 1 duplicate (101B)
   - Prefix 115: 2 folders → fix 1 duplicate (115B)
   - Write mapping file `prompts/00-PLAYBOOKS/prompt-folder-reindex-map.json`

3. Update `scripts/check-prompts-ordering.ts` to accept variable-width prefixes

## Verification Steps

- No duplicate folder prefixes
- Every phase folder has implement + verify (or is in 00-PLAYBOOKS/00-ARCHIVE)
- Prompt audit outputs committed

## Files Touched

- `scripts/qa/prompts-canonical-audit.mjs` (NEW)
- `prompts/00-PLAYBOOKS/prompt-folder-reindex-map.json` (NEW)
- `docs/audits/prompts-canonical-audit.md` (NEW — generated)
- 6 prompt folders renamed to resolve duplicates
