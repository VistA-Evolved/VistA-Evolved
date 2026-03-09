# Phase 636 - CPRS Orders Checks Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- If something is missing, pending, or broken, check the prompt lineage and recover it properly.

## Defect

- Live clinician audit on `/cprs/chart/46/orders` reproduced a real defect on the active VistA order detail pane.
- Clicking `Run Order Checks` on an existing active order surfaced raw VistA M errors in the UI:
  - `M ERROR=ACCEPT+7^ORWDXC, Undefined local variable: ORL`
- Root cause: `POST /vista/cprs/order-checks` calls `ORWDXC ACCEPT` with incomplete parameters for this workflow, and the frontend exposes the action on active existing orders where the CPRS order-check session/context is not available.

## Inventory

- Inspected files:
  - `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
  - `apps/api/src/routes/cprs/orders-cpoe.ts`
  - `apps/api/src/routes/cprs/order-check-types.ts`
  - `prompts/64-PHASE-59-CPOE-PARITY/64-01-IMPLEMENT.md`
  - `prompts/434-PHASE-434-ORDER-CHECK-ENHANCEMENT/434-NOTES.md`
- Existing route involved:
  - `POST /vista/cprs/order-checks`
- Existing UI involved:
  - Orders detail action bar in `OrdersPanel.tsx`

## Implementation Steps

1. Make `/vista/cprs/order-checks` detect raw M error payloads from `ORWDXC ACCEPT` and convert them into a truthful pending response instead of treating them as successful checks.
2. Update the Orders panel so `Run Order Checks` is not offered on active existing VistA orders where the required CPRS order-check session/context is unavailable.
3. Surface a clinician-facing note explaining that order checks are available during new/unsigned order workflows, not for already-active orders in this sandbox path.
4. Re-run the live Orders workflow against DFN 46 and verify that the prior raw M error is gone.

## Files Touched

- `prompts/636-PHASE-636-CPRS-ORDERS-CHECKS-TRUTHFULNESS-RECOVERY/636-01-IMPLEMENT.md`
- `prompts/636-PHASE-636-CPRS-ORDERS-CHECKS-TRUTHFULNESS-RECOVERY/636-99-VERIFY.md`
- `apps/api/src/routes/cprs/orders-cpoe.ts`
- `apps/web/src/components/cprs/panels/OrdersPanel.tsx`