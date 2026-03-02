# Phase 474 — W32-P2: Verify — Prompt Phase File-Name Standardization

## Verification Steps

1. Run `node scripts/qa-gates/wave-phase-lint.mjs` — must PASS
2. Run `node scripts/qa-gates/prompts-tree-health.mjs` — must PASS (or WARN-only)
3. Failure-mode test: create temp wave folder missing VERIFY.md -> lint FAILs
4. Remove temp folder -> lint passes again
5. No old-style files remain in any wave folder

## Acceptance Criteria

- [ ] All wave folders use IMPLEMENT.md / VERIFY.md / NOTES.md (no NNN- prefix)
- [ ] Lint gate passes clean
- [ ] Prompts tree health passes
- [ ] Evidence captured
