# Phase 654 - CPRS Orders Sign Recovery

## User Request

- Continue the clinician chart audit until the UI and backend behave like a real production system.
- Use VistA-first verification and fix real clinician-visible defects instead of leaving pending placeholders.

## Problem Statement

- The clinician chart Orders tab can reach the Sign Order action for live VistA orders.
- Signing the unsigned discontinue order for DFN 46 leaked a raw `ORWOR1 SIG` M error into the UI.
- The sign route in `apps/api/src/routes/cprs/orders-cpoe.ts` drifted from the executor contract in `apps/api/src/writeback/executors/orders-executor.ts`.
- The route called `ORWOR1 SIG` with `[dfn, orderIenStr, esCode]` instead of the executor's `[orderIen, esCode]` pattern and did not bracket the call with `ORWDX LOCK` and `ORWDX UNLOCK`.

## Implementation Steps

1. Align `POST /vista/cprs/orders/sign` with the executor-backed contract: `ORWDX LOCK`, `ORWOR1 SIG(orderIen, esCode)`, `ORWDX UNLOCK`.
2. Keep idempotency, audit logging, and PG sign event logging intact.
3. Prevent raw M output from reaching the chart by returning structured blockers when VistA reports runtime failures.
4. Update the canonical clinical journeys runbook so the Orders sign contract documents the lock/sign/unlock pattern.
5. Update ops artifacts with the defect, root cause, and live verification evidence.

## Files Touched

- `apps/api/src/routes/cprs/orders-cpoe.ts`
- `docs/runbooks/canonical-clinical-journeys.md`
- `ops/summary.md`
- `ops/notion-update.json`
