# Phase 52 — E2E Scenario Tests + Performance Budgets (RC Hardening)

## User Request

Prove the system works like a real hospital workflow. Create automated scenario
tests + performance budgets.

## Deliverables

A) **E2E Scenario Tests** — 3 Playwright scenario specs
B) **No Dead Click Contract** — Enhanced dead-click test for all key screens
C) **Performance Budgets** — Budget config + k6 load test with thresholds
D) **Docs** — e2e-testing.md + performance-budgets.md runbooks

## Implementation Steps

1. Create `apps/web/e2e/scenario-clinical.spec.ts` — Scenario 1 (clinician workflow)
2. Create `apps/web/e2e/scenario-rcm.spec.ts` — Scenario 2 (RCM workflow)
3. Create `apps/web/e2e/scenario-portal.spec.ts` — Scenario 3 (patient portal) (in apps/portal/e2e/)
4. Create `apps/web/e2e/no-dead-clicks.spec.ts` — Enhanced no-dead-click contract
5. Create `config/performance-budgets.json` — Budget definitions
6. Create `tests/k6/perf-budgets.js` — k6 load test with budget thresholds
7. Write `docs/runbooks/e2e-testing.md`
8. Write `docs/runbooks/performance-budgets.md`
9. TypeScript compile check + commit

## Files Touched

- apps/web/e2e/scenario-clinical.spec.ts (new)
- apps/web/e2e/scenario-rcm.spec.ts (new)
- apps/portal/e2e/scenario-portal.spec.ts (new)
- apps/web/e2e/no-dead-clicks.spec.ts (new)
- config/performance-budgets.json (new)
- tests/k6/perf-budgets.js (new)
- docs/runbooks/e2e-testing.md (new)
- docs/runbooks/performance-budgets.md (new)

## Verification

- `npx tsc --noEmit` clean in apps/web and apps/portal
- Scripts are structurally correct (parseable)
- Budget config is valid JSON
