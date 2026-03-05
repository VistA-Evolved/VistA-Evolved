# Phase 577 — NOTES

## Before/After Counts

| Metric | Before | After |
|--------|--------|-------|
| Unresolved tokens | 80 | 2 |
| Resolved via base phase | 0 | 78 |
| Ambiguous tokens | 4 | 4 |
| Resolved to single folder | 461 | 466 |

## Remaining Unresolved

Only 2 tokens remain unresolved — both are internal script step labels,
not real phase references:

- **Phase 0** (2 refs) — `docs/SESSION_LOG.md` section headers ("Phase 0: Environment Verification")
- **Phase 4** (10 refs) — `scripts/dr/restore-verify.mjs` and `scripts/restart-drill.mjs` internal step numbering

These are not actionable — the scripts use "Phase N" to number their internal
verification steps, not to reference prompt phases.

## Changes Made

1. `scripts/qa/phase-comment-audit.mjs` — Added subphase resolution logic.
   Tokens matching `/^(\d+)([A-Za-z].*)$/` extract the base digits and look up
   in phase-index. New `resolvedViaBasePhase` category in summary and markdown.
   Also loads `docs/qa/phase-canonical-map.json` for direct canonical overrides.

2. `scripts/prompt-ref.mjs` — Added subphase fallback in `--phase` handler.
   When no exact/prefix match found, tries base phase extraction. Prints
   "Resolved by base phase: N (from NX)" message before results.

3. `docs/qa/phase-canonical-map.json` — Created canonical mapping for the
   4 ambiguous tokens (263, 283, 284, 290).

4. `docs/qa/phase-comment-audit.json` + `.md` — Regenerated with new counts.
