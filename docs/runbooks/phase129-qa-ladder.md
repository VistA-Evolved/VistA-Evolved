# Phase 129 — QA Ladder Runbook

## Overview

Phase 129 introduces a 5-workstream QA Ladder that catches "verifier always passes but
product is broken" scenarios. Each workstream targets a different failure class.

## Architecture

```
qa/gauntlet/gates/g14-qa-ladder.mjs   -- Gauntlet gate (structural checks)
apps/web/e2e/
  qa-ladder-journeys.spec.ts           -- Workstream A: Playwright journeys
  visual-regression.spec.ts            -- Workstream E: Visual regression
apps/api/tests/
  qa-ladder-contracts.test.ts          -- Workstream B: Contract tests
  rpc-trace-replay.test.ts             -- Workstream C: RPC golden trace
  chaos-restart.test.ts                -- Workstream D: Chaos/restart
  fixtures/rpc-golden-trace.json       -- Golden trace baseline (NO PHI)
```

## Workstream Details

### A: Playwright Journeys (`qa-ladder-journeys.spec.ts`)

| Journey   | What it tests                                                    |
| --------- | ---------------------------------------------------------------- |
| Journey 1 | Login -> patient search -> cover sheet -> 3 clinical tabs        |
| Journey 2 | Orders tab navigation                                            |
| Journey 3 | Dead-click audit: clicks every button, fails on >5 silent no-ops |
| Journey 4 | API health/ready after E2E exercise                              |

**Run:** `cd apps/web && pnpm exec playwright test e2e/qa-ladder-journeys.spec.ts`

### B: Contract Tests (`qa-ladder-contracts.test.ts`)

- 8 clinical endpoint shape contracts (required keys, array fields, timing budget)
- Error shape uniformity (all 401s have `{ok: false, error: string}`)
- No placeholder/stub detection
- Security headers (X-Content-Type-Options, httpOnly cookies)
- Input validation enforcement (missing/malformed params -> 400)

**Run:** `cd apps/api && pnpm exec vitest run tests/qa-ladder-contracts.test.ts`

### C: RPC Golden Trace (`rpc-trace-replay.test.ts`)

- PHI safety: golden trace contains RPC names ONLY (no params, no responses)
- Registry alignment: every golden RPC exists in `rpcRegistry.ts`
- Critical RPCs can't be accidentally removed
- Sequence stability: login and cover sheet workflows maintain their RPC order
- Live replay: authenticated endpoints return `ok: true` (when API running)

**Run:** `cd apps/api && pnpm exec vitest run tests/rpc-trace-replay.test.ts`

### D: Chaos/Restart (`chaos-restart.test.ts`)

- Health endpoint resilience (10 rapid concurrent calls)
- Session resilience (login -> logout -> re-login cycle)
- Data persistence across sessions (patient search consistency)
- Concurrent clinical reads (5 parallel requests)
- Error shape under stress (expired cookies, malformed JSON, long queries)

**Run:** `cd apps/api && pnpm exec vitest run tests/chaos-restart.test.ts`

### E: Visual Regression (`visual-regression.spec.ts`)

- Login page screenshot baseline
- Patient search page screenshot
- Cover sheet with clinical data screenshot
- Structural regression (required form elements, tab navigation)
- PHI masking on timestamps and user-specific data

**Run:** `cd apps/web && pnpm exec playwright test e2e/visual-regression.spec.ts`

Update baselines: `pnpm exec playwright test --update-snapshots`

## G14 Gauntlet Gate

The gate validates QA ladder infrastructure is in place:

- All 5 spec files exist
- Test bodies are non-empty (no placeholder tests)
- Golden trace has required structure
- NO PHI/credentials in test fixtures
- Dead-click detection is wired

**Run:** `node qa/gauntlet/cli.mjs --suite rc` (includes G14)

## PHI Safety

- Golden trace: RPC names only, no parameters or response bodies
- Visual regression: uses Playwright masks on timestamps and user data
- Contract tests: verify responses don't leak stack traces
- All test files use `process.env` fallbacks for credentials (never hardcoded)

## Manual Testing

```powershell
# Run all QA Ladder tests
cd apps/api; pnpm exec vitest run tests/qa-ladder-contracts.test.ts
cd apps/api; pnpm exec vitest run tests/rpc-trace-replay.test.ts
cd apps/api; pnpm exec vitest run tests/chaos-restart.test.ts
cd apps/web; pnpm exec playwright test e2e/qa-ladder-journeys.spec.ts
cd apps/web; pnpm exec playwright test e2e/visual-regression.spec.ts

# Run gauntlet gate only
node qa/gauntlet/cli.mjs --suite rc
```

## Troubleshooting

| Symptom                             | Fix                                                         |
| ----------------------------------- | ----------------------------------------------------------- |
| Playwright tests fail with timeout  | Ensure API (3001) and web (3000) are running                |
| Visual regression baseline mismatch | Run with `--update-snapshots` to regenerate                 |
| Contract tests fail with 401        | Check VistA Docker is running on port 9430                  |
| RPC trace test fails on registry    | RPC was renamed/removed -- update golden trace              |
| Dead-click count > 5                | New buttons need handlers or "integration pending" messages |
