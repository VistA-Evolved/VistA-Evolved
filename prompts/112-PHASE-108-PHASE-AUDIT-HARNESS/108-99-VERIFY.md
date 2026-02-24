# Phase 108 -- Phase Audit Harness (VERIFY)

## Verification Gates

1. `node scripts/build-phase-index.mjs` exits 0 and produces `docs/qa/phase-index.json`
2. `docs/qa/phase-index.json` has phaseCount >= 115
3. `node scripts/generate-phase-qa.mjs` exits 0
4. E2E spec count >= 7 in `apps/web/e2e/phases/`
5. API spec count >= 2 in `apps/api/tests/phases/`
6. `node scripts/qa-gates/phase-index-gate.mjs` exits 0 (all 6 checks pass)
7. `pnpm qa:phase-audit` exits 0
8. Root package.json contains: qa:phase, qa:range, qa:phase-index, qa:phase-audit
9. `.github/workflows/qa-gauntlet.yml` contains "phase-index-gate" and "phase-audit"
10. `scripts/phase-qa-runner.mjs` supports: phase, range, all, index, generate commands
11. No new `console.log` violations (cap <= 6)
12. TypeScript check passes: `cd apps/api && pnpm exec tsc --noEmit`
