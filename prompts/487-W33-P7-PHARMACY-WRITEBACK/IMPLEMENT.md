# Phase 487 — W33-P7: Order Sign + Checks + List Fallbacks

## Goal

Convert remaining 3 CPRS order fallback paths from raw `integration-pending`
strings to capability-probed responses.

## Endpoints Targeted

| #   | Method | Path                     | Fallback Trigger        | Target RPC    |
| --- | ------ | ------------------------ | ----------------------- | ------------- |
| 1   | GET    | /vista/cprs/orders       | ORWORR AGET unavailable | ORWORR AGET   |
| 2   | POST   | /vista/cprs/orders/sign  | ORWOR1 SIG unavailable  | ORWOR1 SIG    |
| 3   | POST   | /vista/cprs/order-checks | ORWDXC ACCEPT fallback  | ORWDXC ACCEPT |

## Files Changed

- `apps/api/src/routes/cprs/orders-cpoe.ts`
