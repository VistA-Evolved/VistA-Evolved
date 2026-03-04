# Phase 416 — W24-P8: Post-Go-Live Monitoring + SRE — IMPLEMENT

## Objective

Define SLOs, error budget policy, and build an SRE monitoring subsystem
with incident tracking and SLO budget management.

## Deliverables

1. `docs/sre/SLOS.md` — 6 SLO definitions with targets, windows, budgets
2. `docs/sre/ERROR_BUDGET_POLICY.md` — 4-tier budget policy + incident severity
3. `apps/api/src/pilots/sre/types.ts` — SLO + incident + dashboard types
4. `apps/api/src/pilots/sre/sre-store.ts` — in-memory SLO + incident store
5. `apps/api/src/pilots/sre/sre-routes.ts` — 7 REST endpoints
6. `apps/api/src/pilots/sre/index.ts` — barrel export
7. Route wiring in `register-routes.ts`

## Endpoints

| Method | Path                                 | Purpose                |
| ------ | ------------------------------------ | ---------------------- |
| GET    | /pilots/sre/slos                     | All SLO snapshots      |
| GET    | /pilots/sre/slos/:sloId              | Single SLO snapshot    |
| POST   | /pilots/sre/slos/:sloId/update       | Update SLO measurement |
| GET    | /pilots/sre/incidents                | List incidents         |
| GET    | /pilots/sre/incidents/:id            | Get incident           |
| POST   | /pilots/sre/incidents                | Create incident        |
| POST   | /pilots/sre/incidents/:id/transition | Transition incident    |
| GET    | /pilots/sre/dashboard                | SRE dashboard          |
