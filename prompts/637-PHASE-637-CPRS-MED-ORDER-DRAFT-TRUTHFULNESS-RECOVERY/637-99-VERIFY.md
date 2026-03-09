# Phase 637 - VERIFY - CPRS Medication Order Draft Truthfulness Recovery

## Live Verification

1. Open `/cprs/chart/46/orders` as clinician.
2. Open `+ New Order` and place a medication quick-order such as `ASPIRIN` or `LISINOPRIL`.
3. If `POST /vista/medications` returns draft/sync-pending rather than a live order IEN:
   - the UI must not say `Order created`
   - the UI must say draft/pending/sync-pending truthfully
   - the local order cache must show the draft medication order
4. If a live `orderIEN` is returned, the UI may report a real created/unsigned order.

## Regression

1. Existing active VistA orders still render in the Orders panel.
2. Orders composer still closes after successful submission.
3. No compile errors in `OrdersPanel.tsx`.