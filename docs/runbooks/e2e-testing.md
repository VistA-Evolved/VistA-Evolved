# E2E Testing Runbook

> Phase 52 — End-to-End Scenario Tests

## Overview

VistA-Evolved uses Playwright for browser-based E2E tests and k6 for API
load/performance tests. This runbook covers the Playwright E2E test suite.

## Prerequisites

- API running on `localhost:3001` (with VistA Docker for full data)
- Web app running on `localhost:3000` (`pnpm -C apps/web dev`)
- Portal app running on `localhost:3002` (`pnpm -C apps/portal start`)
- Playwright browsers installed: `pnpm -C apps/web exec playwright install`

## Test Suites

### Scenario Tests (Phase 52)

| File                        | Scenario           | What It Tests                                                 |
| --------------------------- | ------------------ | ------------------------------------------------------------- |
| `scenario-clinical.spec.ts` | Clinician workflow | Login -> search -> cover sheet -> problems -> add problem     |
| `scenario-rcm.spec.ts`      | RCM workflow       | RCM admin -> payer directory -> claims -> connectors -> audit |
| `scenario-portal.spec.ts`   | Patient portal     | Portal login -> dashboard -> health/meds/appointments         |

### Contract Tests (Phase 52)

| File                     | Contract       | What It Enforces                                                                           |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------ |
| `no-dead-clicks.spec.ts` | No dead clicks | Every button either navigates, opens dialog, changes state, or shows "integration pending" |

### Existing Tests (Phase 37)

| File                          | What It Tests                                      |
| ----------------------------- | -------------------------------------------------- |
| `login-flow.spec.ts`          | Login form rendering, valid/invalid credentials    |
| `cprs-tabs.spec.ts`           | All 15 CPRS chart tabs load with non-empty content |
| `clinical-flows.spec.ts`      | Clinical tab buttons respond (no dead clicks)      |
| `menu-no-dead-clicks.spec.ts` | Menu bar items all trigger actions                 |
| `parity-enforcement.spec.ts`  | CPRS parity coverage                               |
| `accessibility.spec.ts`       | axe-core accessibility audit                       |
| `console-error-gate.spec.ts`  | Console error budget                               |

## Running Tests

```bash
# Run all E2E tests (CPRS web)
cd apps/web
pnpm exec playwright test

# Run specific scenario
pnpm exec playwright test e2e/scenario-clinical.spec.ts

# Run no-dead-click contract only
pnpm exec playwright test e2e/no-dead-clicks.spec.ts

# Run with UI mode (interactive)
pnpm exec playwright test --ui

# Run portal scenarios
cd apps/portal
pnpm exec playwright test e2e/scenario-portal.spec.ts
```

## Auth Setup

Tests use a shared auth setup (`auth.setup.ts`) that:

1. Calls `POST /auth/login` with VistA credentials
2. Saves session cookie to `e2e/.auth/user.json`
3. All subsequent tests reuse this session

Credentials default to `PROV123 / PROV123!!` (WorldVistA Docker sandbox).
Override via `VISTA_ACCESS_CODE` and `VISTA_VERIFY_CODE` env vars.

## No Dead Click Contract

The no-dead-click contract (`no-dead-clicks.spec.ts`) enforces that every
interactive element on key screens produces a visible response:

1. **Navigation** -- URL changes after click
2. **Dialog/Modal** -- A dialog, modal, or popover opens
3. **State Change** -- Page content visibly changes
4. **Integration Pending** -- Explicit message about what is pending and why

Silent no-ops are failures. If a feature isn't wired, the button must show
an "integration pending" message with:

- What subsystem is pending
- Target VistA file/routine (if applicable)
- Next implementation step

### Screens Tested

- **CPRS Chart**: Cover, Problems, Meds, Orders, Notes, Labs, Imaging
- **Admin Pages**: Modules, RCM, Analytics
- **All 15 Chart Tabs**: Verified non-blank content

## Test Configuration

See `apps/web/playwright.config.ts`:

- Timeout: 60s per test
- Retries: 1
- Workers: 1 (serial, shared auth)
- Browser: Desktop Chrome (headless)
- Screenshots: on failure only
- Traces: on first retry

## Troubleshooting

| Symptom                    | Cause                                    | Fix                                                      |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Auth setup fails           | API not running or VistA Docker down     | Start API + Docker                                       |
| Timeouts on clinical tabs  | VistA RPC broker slow or disconnected    | Check Docker, increase timeout                           |
| Dead click false positives | Button uses JS state change not detected | Add to test's detection logic                            |
| Portal tests 404           | Portal app not built/running             | `pnpm -C apps/portal build && pnpm -C apps/portal start` |

## CI Integration

E2E tests require running infrastructure (API + VistA Docker + web app).
For CI, use the Playwright config's `webServer` directive to auto-start
the web app. The API + VistA Docker must be started separately.

```yaml
# Example GitHub Actions step
- name: Run E2E tests
  run: |
    cd apps/web
    pnpm exec playwright install --with-deps
    pnpm exec playwright test
  env:
    API_URL: http://localhost:3001
    VISTA_ACCESS_CODE: PROV123
    VISTA_VERIFY_CODE: PROV123!!
```
