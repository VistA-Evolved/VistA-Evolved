# Phase 676 - IMPLEMENT: CPRS Coversheet Orders Summary Convergence Recovery

## User Request

- Continue the live clinician audit until the CPRS UI behaves like a truthful production system.
- Keep the implementation VistA-first and repair real frontend/backend defects instead of accepting misleading chart data.
- If a feature is already built elsewhere in the codebase, reuse the proven VistA-backed path rather than maintaining a weaker duplicate implementation.

## Problem

- The Cover Sheet Orders Summary route can return different unsigned-order results than the Orders tab in the same authenticated session.
- Under real Cover Sheet load, `/vista/cprs/orders-summary?dfn=46` intermittently returns duplicate discontinue rows and the wrong unsigned count even though the recovered active-orders path can return a truthful single unsigned order.
- The current route still uses a bespoke active-order fallback instead of the richer recovered orders loader, so the two clinician views can drift.

## Inventory

- Inspected: `apps/api/src/routes/cprs/wave1-routes.ts`
- Inspected: `apps/api/src/routes/cprs/orders-cpoe.ts`
- Inspected: `apps/api/src/lib/rpc-resilience.ts`
- Verified in browser: `/cprs/chart/46/cover`
- Verified live API routes: `/vista/cprs/orders-summary?dfn=46`, `/vista/cprs/orders?dfn=46&filter=active`
- Verified same-session behavior against VEHU patient DFN 46 using clinician credentials `PRO1234 / PRO1234!!`

## Implementation Steps

1. Extract or reuse the recovered active-orders parsing logic from the Orders route instead of maintaining a second unsigned-order fallback implementation inside the Cover Sheet wave-1 routes.
2. Make the Orders Summary fallback derive its unsigned rows from the same normalized active-order dataset the Orders tab uses, filtering for truthful unsigned rows only.
3. Preserve the existing response contract for `/vista/cprs/orders-summary` while removing duplicate/incorrect fallback rows caused by the weaker ad hoc parser.
4. Keep the route VistA-first: prefer `ORWORB UNSIG ORDERS` when it is truthful, but converge on the recovered `ORWORR AGET`/`GETTXT`/`GETBYIFN` path when the unsigned-orders RPC is unavailable or not trustworthy on this lane.
5. Re-verify in a fresh authenticated Cover Sheet session that Orders Summary matches the live Orders route and no longer inflates unsigned counts.

## Files Touched

- `prompts/676-PHASE-676-CPRS-COVERSHEET-ORDERS-SUMMARY-CONVERGENCE-RECOVERY/676-01-IMPLEMENT.md`
- `prompts/676-PHASE-676-CPRS-COVERSHEET-ORDERS-SUMMARY-CONVERGENCE-RECOVERY/676-99-VERIFY.md`
- `apps/api/src/routes/cprs/orders-cpoe.ts`
- `apps/api/src/routes/cprs/wave1-routes.ts`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `ops/summary.md`
