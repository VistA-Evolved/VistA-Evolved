# Phase 149 -- Truth Refresh + Residual Gap Burn-Down (VERIFY)

## Gates

1. `docs/audits/system-audit.md` headSha matches current HEAD
2. `qa/gauntlet/system-gap-matrix.json` headSha matches current HEAD
3. `docs/audits/phase149-burndown.md` exists with before/after comparison
4. High gaps reduced or explicitly justified with target RPCs/adapters
5. No new scattered docs (only audits/ and qa/gauntlet/)
6. Store-policy gate passes in gauntlet RC
7. TypeScript compiles clean across all packages
8. Gauntlet FAST: 0 FAIL
9. Gauntlet RC: 0 FAIL
10. No prompt ordering regressions
