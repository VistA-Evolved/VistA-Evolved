# Phase 105 -- QA Gauntlet v1 (IMPLEMENT)

## Goal
Build an automated "human QA replacement" gauntlet that detects dead clicks,
missing dialogs, broken routing, validates UI-API-VistA wiring, and runs
locally + CI with a single command.

## Deliverables
1. Root `pnpm qa:*` commands (smoke, all, api, web, security, vista)
2. Playwright E2E smoke tests (login, patient search, CPRS tabs, dead clicks)
3. API integration tests (route existence, auth flows, VistA probes)
4. Security & PHI gate automation (secret scan, redaction, dep audit)
5. GitHub Actions CI workflow (PR: smoke+security, nightly: all)
6. Prompts folder integrity check in qa:all
7. Runbook: docs/runbooks/phase105-qa-gauntlet.md

## Files touched
- package.json (root) -- qa:* scripts
- apps/web/e2e/qa-smoke.spec.ts -- new smoke E2E
- apps/api/tests/qa-api-routes.test.ts -- new API route tests
- apps/api/tests/qa-security.test.ts -- new security tests
- scripts/qa-runner.mjs -- orchestrator script
- .github/workflows/qa-gauntlet.yml -- CI workflow
- docs/runbooks/phase105-qa-gauntlet.md -- runbook
