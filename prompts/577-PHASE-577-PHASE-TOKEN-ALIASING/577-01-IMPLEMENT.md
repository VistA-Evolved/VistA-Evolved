# Phase 577 — PHASE TOKEN RESOLUTION: SUBPHASES + CANONICAL MAP

## Objective

Reduce ~80 unresolved phase tokens in `docs/qa/phase-comment-audit.md` by
adding deterministic subphase aliasing to the audit and prompt-ref scripts.
Do NOT rewrite code comments — only improve resolution tooling.

## Requirements

### A. `scripts/qa/phase-comment-audit.mjs`

In the classify section, when a token has zero matching folders:

1. Check if the token matches `/^(\d+)([A-Za-z].*)$/` (e.g. "15B", "103B").
2. Extract the leading digits as the base phase number.
3. Look up the base in `phaseToFolders`.
4. If found, classify the entry as `resolvedViaBasePhase` (new category).
5. Record `basePhase` and `baseFolder(s)` on the entry.
6. Add `resolvedViaBasePhase` count to the JSON summary and markdown report.
7. Also load `docs/qa/phase-canonical-map.json` (if it exists) to resolve
   ambiguous tokens directly.

### B. `scripts/prompt-ref.mjs`

When `--phase 15B` finds no exact match:

1. Try extracting the base number ("15") from the token.
2. If the base has matches in the index, output them with a note:
   `Resolved by base phase: 15 (from 15B)`.
3. Don't change behavior for tokens that already have exact matches (e.g. 37C).

### C. `docs/qa/phase-canonical-map.json`

Create a canonical mapping file for ambiguous tokens (those that resolve to
multiple prompt folders):

```json
{
  "284": "282-PHASE-284-THEME-PACKS-BRANDING",
  "263": "260-PHASE-263-SUPPORT-TOOLING-V2",
  "290": "290-PHASE-290-WAVE9-INTEGRITY-AUDIT",
  "283": "281-PHASE-283-THEME-SYSTEM-CORE"
}
```

### D. Regenerate Audit

After script changes, run the audit to regenerate:

- `docs/qa/phase-comment-audit.json`
- `docs/qa/phase-comment-audit.md`

Verify that unresolved count drops significantly (target: <10 truly unresolved).

## Files Touched

- `scripts/qa/phase-comment-audit.mjs` — subphase resolution logic
- `scripts/prompt-ref.mjs` — subphase fallback in `--phase` mode
- `docs/qa/phase-canonical-map.json` — new canonical map
- `docs/qa/phase-comment-audit.json` — regenerated
- `docs/qa/phase-comment-audit.md` — regenerated
- `prompts/577-PHASE-577-PHASE-TOKEN-ALIASING/NOTES.md` — before/after counts
