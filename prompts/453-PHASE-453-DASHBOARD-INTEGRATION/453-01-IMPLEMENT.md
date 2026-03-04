# Phase 453 — W29-P7: Dashboard/Rules Engine Integration

## Objective

Implement the DashboardAdapter per ADR-W29-HARVEST-DASHBOARD.md. Provides
interface + stub + WorldVistA adapter for clinical rules and alerts.

## Deliverables

| #   | File                                                    | Purpose                            |
| --- | ------------------------------------------------------- | ---------------------------------- |
| 1   | `apps/api/src/adapters/dashboard/interface.ts`          | DashboardAdapter interface + types |
| 2   | `apps/api/src/adapters/dashboard/stub-adapter.ts`       | Stub returning pending status      |
| 3   | `apps/api/src/adapters/dashboard/worldvista-adapter.ts` | HTTP bridge to Dashboard service   |
| 4   | `apps/api/src/routes/dashboard-routes.ts`               | REST endpoints for rules/alerts    |

## Acceptance Criteria

1. Interface defines getRules, evaluateRules, getAlerts, getPatientLists
2. Stub adapter returns {ok: false, pending: true} for all methods
3. WorldVistA adapter makes HTTP calls to configurable endpoint
4. Routes registered behind session auth
