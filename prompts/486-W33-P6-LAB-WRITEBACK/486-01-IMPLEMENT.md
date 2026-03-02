# Phase 486 — W33-P6: Lab/Imaging/Consult Order Fallbacks

## Goal
Convert 3 CPRS order entry fallback paths from raw `integration-pending`
strings to capability-probed responses with evidence.

## Endpoints Targeted
| # | Method | Path | Fallback Trigger | Target RPC |
|---|--------|------|------------------|------------|
| 1 | POST | /vista/cprs/orders/lab | No QO match in sandbox | ORWDXM AUTOACK |
| 2 | POST | /vista/cprs/orders/imaging | No imaging QOs configured | ORWDXM AUTOACK |
| 3 | POST | /vista/cprs/orders/consult | Always (dialog not built) | ORWDX SAVE |

## Implementation Steps
1. Import `probeTier0Rpc` in `routes/cprs/orders-cpoe.ts`
2. Add probe evidence to lab no-QO fallback, replace `"integration-pending"`
3. Add probe evidence to imaging default fallback, replace `"integration-pending"`
4. Add probe evidence to consult always-pending, replace `"integration-pending"`

## Notes
- Lab/imaging already work when QO IENs are provided — the fallback is a
  sandbox config limitation, not an RPC issue
- Consult ORWDX SAVE RPC exists but requires full ORDIALOG parameter build
- Draft creation preserved for backwards compatibility
- These endpoints use `audit()` not `immutableAudit()` — no audit type changes needed
