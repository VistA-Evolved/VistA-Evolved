# Phase 475 — W32-P3: Verify — Fix Phase Index Gate Freshness

## Verification Steps

1. Run `node scripts/build-phase-index.mjs` — completes without error
2. Run `node scripts/qa-gates/phase-index-gate.mjs` — must PASS or WARN-only
3. Verify phase-index.json includes wave-style folders
4. Verify phase count matches actual folder count

## Acceptance Criteria

- [ ] Phase index builder discovers all folder styles
- [ ] Phase index gate passes
- [ ] Generated index includes wave folders (W14+)
- [ ] Evidence captured
