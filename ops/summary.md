# Phase 105 -- QA Gauntlet v1

## What Changed

- **QA Runner**: `scripts/qa-runner.mjs` orchestrator — 7 suites (smoke, api, web, security, vista, prompts, all), per-gate pass/fail, 5min timeout per gate
- **QA Gates**: `scripts/qa-gates/api-health.mjs` + `scripts/qa-gates/vista-probe.mjs`
- **Root Commands**: 7 `pnpm qa:*` scripts in package.json
- **E2E Smoke**: `apps/web/e2e/qa-smoke.spec.ts` — 7 tests (login, bad-creds, patient search, 18 tabs, dead-click, admin)
- **API Integration Tests**: `apps/api/tests/qa-api-routes.test.ts` — 28 tests (public endpoints, auth flow, clinical auth gates, authenticated reads, admin/RCM/analytics, error safety)
- **Security Tests**: `apps/api/tests/qa-security.test.ts` — secret scanning, .gitignore guards, PHI redaction, security headers, console.log discipline
- **CI Workflow**: `.github/workflows/qa-gauntlet.yml` — PR (typecheck + security + prompts), API tests, nightly E2E
- **BUG-067 extension**: Rate limiter + origin check now set `_rejected` flag; auth gateway checks `_rejected || reply.sent` at entry

## Verification Results

- **qa:smoke**: 3/3 PASS (health 0.2s, 28 API tests 22.7s, 7 E2E tests 120.2s)
- **API**: Survived E2E burst without crash (195s uptime post-smoke)

## How to Test

```bash
pnpm qa:smoke        # 3 gates: health + API tests + E2E smoke
pnpm qa:all          # All gates combined
```

## Follow-ups

- Exempt k6 test files from secret scan
- Replace console.log in normalizeVivianSnapshot.ts with structured logger
