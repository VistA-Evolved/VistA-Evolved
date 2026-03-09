# Phase 638 - CPRS Order Discontinue Unsigned Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or incomplete workflows by checking the prompt lineage and fixing the actual clinician-facing behavior.

## Defect

- Live Orders audit on DFN 46 showed that `POST /vista/cprs/orders/dc` can create a new unsigned discontinue order in VistA instead of fully discontinuing the original order.
- Current API behavior incorrectly returns `status: discontinued` and the Orders panel shows `Order discontinued via ORWDXA DC`.
- After refresh, the original order remains active and the new discontinue request appears in the active list, but the list labels it `active` even though the display text contains `*UNSIGNED*`.

## Inventory

- Inspected files:
  - `apps/api/src/routes/cprs/wave2-routes.ts`
  - `apps/api/src/routes/cprs/orders-cpoe.ts`
  - `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
- Existing routes involved:
  - `POST /vista/cprs/orders/dc`
  - `GET /vista/cprs/orders`
- Existing UI involved:
  - Orders detail action pane
  - Orders list row status rendering

## Implementation Steps

1. Update `POST /vista/cprs/orders/dc` to detect unsigned discontinue responses and return sync-pending truth instead of claiming the source order is already discontinued.
2. Update `GET /vista/cprs/orders` status normalization so orders whose resolved display text contains `*UNSIGNED*` are surfaced as `unsigned`, not `active`.
3. Re-run the live discontinue flow against DFN 46 and verify the panel/message reflect the real postcondition.

## Files Touched

- `prompts/638-PHASE-638-CPRS-ORDER-DC-UNSIGNED-TRUTHFULNESS-RECOVERY/638-01-IMPLEMENT.md`
- `prompts/638-PHASE-638-CPRS-ORDER-DC-UNSIGNED-TRUTHFULNESS-RECOVERY/638-99-VERIFY.md`
- `apps/api/src/routes/cprs/wave2-routes.ts`
- `apps/api/src/routes/cprs/orders-cpoe.ts`