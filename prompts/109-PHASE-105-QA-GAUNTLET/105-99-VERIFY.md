# Phase 105 -- QA Gauntlet v1 (VERIFY)

## Gates

1. `pnpm qa:smoke` exits 0
2. `pnpm qa:api` exits 0 (with API running)
3. `pnpm qa:security` exits 0
4. `pnpm qa:web` exits 0 (with API + web running)
5. `pnpm qa:vista` exits 0 (with VistA Docker running)
6. `pnpm qa:all` exits 0 (all above + prompts check)
7. CI workflow file parses as valid YAML
8. Runbook exists at docs/runbooks/phase105-qa-gauntlet.md
9. No new secrets introduced
10. No new console.log added
