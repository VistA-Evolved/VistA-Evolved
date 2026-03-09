# Phase 649 - IMPLEMENT: CPRS Cover Sheet Orders Summary Truthfulness Recovery

## User Request

- Continue the live clinician chart audit and fix real CPRS cover sheet defects instead of leaving stale integration-pending posture after deeper route recoveries.
- Keep cover sheet summaries aligned with live VistA-first backend truth.
- Reuse recovered order-entry read paths when they already provide a more accurate live answer than the older wave-1 route.

## Problem

The CPRS Cover Sheet Orders Summary card still relies on `ORWORB UNSIG ORDERS`. In VEHU that RPC is unavailable, so `GET /vista/cprs/orders-summary?dfn=46` returns `integration-pending` with `unsigned:0`. But the recovered Orders tab route proves there is a real unsigned order for DFN 46 via `ORWORR AGET` + enrichment. The cover sheet therefore shows a false pending/unavailable posture instead of the live unsigned order count.

## Inventory

- Inspected: `apps/api/src/routes/cprs/wave1-routes.ts`
- Inspected: `apps/api/src/routes/cprs/orders-cpoe.ts`
- Inspected: `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- Inspected: `docs/runbooks/phase56-wave1-layout.md`
- Inspected: `prompts/605-PHASE-605-CPRS-COVERSHEET-ORDERS-RECOVERY/605-01-IMPLEMENT.md`

## Implementation Steps

1. Confirm live mismatch between `/vista/cprs/orders-summary?dfn=46` and `/vista/cprs/orders?dfn=46`.
2. Update the cover sheet orders-summary backend route so it first tries `ORWORB UNSIG ORDERS`, then falls back to the recovered active-orders read path when the dedicated unsigned-orders RPC is unavailable.
3. Keep the response truthful: use live unsigned orders from `ORWORR AGET`/`GETBYIFN`/`GETTXT` when available, and only return pending posture when neither route can provide trustworthy data.
4. Preserve existing Cover Sheet UI wiring so the card automatically renders the recovered summary without a parallel UI rewrite.
5. Update the wave-1 cover sheet runbook and ops artifacts.

## Verification Steps

1. Verify Docker and API health.
2. Confirm `GET /vista/cprs/orders?dfn=46` returns at least one unsigned order.
3. Confirm `GET /vista/cprs/orders-summary?dfn=46` now returns that unsigned count and recent rows instead of permanent pending posture.
4. Open `/cprs/chart/46/cover` and confirm the Orders Summary card shows the live unsigned order count.
5. Confirm no new diagnostics in edited files.

## Files Touched

- `apps/api/src/routes/cprs/wave1-routes.ts`
- `docs/runbooks/phase56-wave1-layout.md`
- `ops/summary.md`
- `ops/notion-update.json`
