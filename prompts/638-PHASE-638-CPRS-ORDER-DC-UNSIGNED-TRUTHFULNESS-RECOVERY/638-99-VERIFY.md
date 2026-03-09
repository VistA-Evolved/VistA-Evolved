# Phase 638 - VERIFY - CPRS Order Discontinue Unsigned Truthfulness Recovery

## Live Verification

1. Open `/cprs/chart/46/orders` as clinician.
2. Run a discontinue action on an active order.
3. If VistA returns a new unsigned discontinue request instead of fully ending the original order:
   - the API must not claim the original order is already discontinued
   - the UI must show a pending/sync-pending discontinue message
   - the new discontinue request in the order list must show `unsigned`, not `active`
4. The original order may still remain active until the discontinue request is signed; that state must be shown truthfully.

## Regression

1. `GET /vista/cprs/orders` still returns active order data.
2. OrdersPanel compiles cleanly.
3. Existing verify and flag messaging remain truthful.