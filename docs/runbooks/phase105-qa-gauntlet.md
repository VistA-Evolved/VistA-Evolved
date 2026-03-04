# Phase 105 — QA Gauntlet v1 Runbook

## Quick Start

```bash
# Run smoke tests (requires API + VistA Docker running)
pnpm qa:smoke

# Run all QA suites
pnpm qa:all

# Individual suites
pnpm qa:api          # API integration + contract tests
pnpm qa:web          # Full Playwright E2E suite
pnpm qa:security     # Secret scan + PHI + dep audit
pnpm qa:vista        # VistA connectivity probes
pnpm qa:prompts      # Prompts folder ordering integrity
```

## Prerequisites

| Requirement         | How                                                            |
| ------------------- | -------------------------------------------------------------- |
| VistA Docker        | `cd services/vista && docker compose --profile dev up -d`      |
| API server          | `cd apps/api && npx tsx --env-file=.env.local src/index.ts`    |
| Web server          | `cd apps/web && pnpm dev` (auto-started by Playwright for E2E) |
| Playwright browsers | `cd apps/web && pnpm exec playwright install chromium`         |

## Suites & Gates

### `qa:smoke` (fast feedback)

1. **API health** — GET `/health`, expects `{ok:true}`
2. **API integration tests** — vitest `qa-api-routes.test.ts` (auth, clinical, admin, RCM)
3. **E2E smoke** — Playwright `qa-smoke.spec.ts` (login, tabs, dead-click, admin)

### `qa:api` (API depth)

1. API health
2. API integration tests
3. API security tests (vitest `qa-security.test.ts`)
4. API contract tests (vitest `contract.test.ts`)

### `qa:security` (static + runtime)

1. Secret scan (`scripts/secret-scan.mjs`)
2. PHI leak scan (`scripts/phi-leak-scan.mjs`)
3. Security tests (headers, console.log discipline)
4. Dependency audit (`pnpm audit --audit-level=critical`)

### `qa:vista`

1. TCP probe to VistA port 9430 + API `/vista/ping`

### `qa:prompts`

1. Prompts ordering integrity (folder naming, duplicates, gaps, .md presence)

### `qa:all`

De-duplicated union of security + api + prompts + smoke.

## Interpreting Failures

Each gate prints `PASS` or `FAIL` with elapsed time. On failure, the last 20 lines of output are shown. The overall exit code is 1 if any gate fails.

```
  PASS  API health (0.3s)
  FAIL  API integration tests (4.2s)
        Expected: 200, Received: 500
        ...
```

**Common failures:**

- `API health FAIL` — API server not running on port 3001
- `VistA probe FAIL` — Docker container not started or port 9430 blocked
- `Secret scan FAIL` — Credential found outside exempted files
- `E2E smoke FAIL` — Web server not reachable or UI regression

## CI Integration

The `.github/workflows/qa-gauntlet.yml` workflow runs:

- **On PR**: typecheck + security gates + prompts ordering
- **On PR (depends on above)**: vitest API tests
- **Nightly (02:00 UTC)**: full E2E Playwright smoke with artifact upload

## Adding New Coverage

1. **New E2E test**: Add to `apps/web/e2e/` and include in `qa-smoke.spec.ts` or as a new spec
2. **New API test**: Add to `apps/api/tests/qa-api-routes.test.ts` or create new test file
3. **New QA gate**: Add `{name, cmd}` entry to the relevant suite in `scripts/qa-runner.mjs`

## Files

| File                                   | Purpose                                   |
| -------------------------------------- | ----------------------------------------- |
| `scripts/qa-runner.mjs`                | QA orchestrator (suites, runner, summary) |
| `scripts/qa-gates/api-health.mjs`      | API health probe gate                     |
| `scripts/qa-gates/vista-probe.mjs`     | VistA connectivity probe                  |
| `apps/web/e2e/qa-smoke.spec.ts`        | Playwright E2E smoke tests                |
| `apps/api/tests/qa-api-routes.test.ts` | API route integration tests               |
| `apps/api/tests/qa-security.test.ts`   | Security & PHI gate tests                 |
| `.github/workflows/qa-gauntlet.yml`    | CI workflow (3 jobs)                      |
