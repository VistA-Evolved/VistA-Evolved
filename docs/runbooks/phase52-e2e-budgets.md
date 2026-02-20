# Phase 52 -- E2E Scenarios + No-Dead-Click Contract + Performance Budgets

## Overview
Phase 52 establishes the real-workflow verification layer:
1. **E2E Scenario Tests** -- Three Playwright test suites covering clinical, RCM, and portal workflows
2. **No-Dead-Click Contract** -- Automated contract that clicks every visible button on CPRS screens and verifies each produces a response
3. **Performance Budgets** -- k6 load test with per-endpoint latency thresholds (smoke/load/stress tiers)

## Prerequisites
- Docker VistA container running (port 9430)
- API running on port 3001 (`npx tsx --env-file=.env.local src/index.ts`)
- Web app running on port 3000 (`pnpm -C apps/web dev`)
- Portal running on port 3002 (`pnpm -C apps/portal dev`)
- Playwright browsers installed (`npx playwright install chromium`)
- k6 installed (`winget install GrafanaLabs.k6`)

## Running E2E Scenarios

### Clinical Scenario (apps/web)
```powershell
cd apps/web
npx playwright test e2e/scenario-clinical.spec.ts --reporter=list
```
Tests: patient search, demographics view, allergy list, add allergy workflow.

### RCM Scenario (apps/web)
```powershell
cd apps/web
npx playwright test e2e/scenario-rcm.spec.ts --reporter=list
```
Tests: admin page load, payer directory, claims tab, draft claim, connectors, audit, export-only banner.

### Portal Scenario (apps/portal)
```powershell
cd apps/portal
npx playwright test e2e/scenario-portal.spec.ts --reporter=list
```
Tests: login, dashboard, telehealth, clinical data, sharing, settings, logout.

## Running No-Dead-Click Contract
```powershell
cd apps/web
npx playwright test e2e/no-dead-clicks.spec.ts --reporter=list --retries=1
```
Covers: Cover Sheet, Problems, Meds, Orders, Notes, Labs, Imaging, Admin Modules, Admin RCM, Admin Analytics, plus tab navigation and integration-pending checks.

**Known flaky**: Labs tab may timeout on first attempt (browser crash during aggressive button clicking). Passes on retry.

## Running Performance Budgets
```powershell
cd <repo-root>
k6 run tests/k6/perf-budgets.js                      # smoke (default)
k6 run -e TIER=load tests/k6/perf-budgets.js          # load
k6 run -e TIER=stress tests/k6/perf-budgets.js        # stress
```

### Thresholds
| Group | p95 Budget |
|-------|-----------|
| Infrastructure (/health, /ready) | < 200ms |
| Auth (/auth/session) | < 5s |
| Clinical reads (patient search, allergies, vitals, etc.) | < 5s |
| Admin reads (modules, capabilities, adapters) | < 1s |
| RPC latency | p95 < 5s, p99 < 10s |

### Rate Limiting Note
The sandbox API rate limiter (200 req/min) will reject excess requests during load/stress tiers. This is expected and correct behavior. The `http_req_failed` threshold is set high (90%) to account for this. **Latency budgets are the real enforcement target.**

## Verification
```powershell
.\scripts\verify-latest.ps1
```

## Troubleshooting
- **Auth 429 (account locked)**: Restart the API to clear in-memory lockout store
- **Playwright auth failure**: Delete `apps/web/e2e/.auth/user.json` and retry
- **k6 not found**: Refresh PATH after install: `$env:PATH = [Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + $env:PATH`
- **Labs flaky timeout**: The Labs panel has many buttons; browser may crash during aggressive clicking. Retry resolves it.
