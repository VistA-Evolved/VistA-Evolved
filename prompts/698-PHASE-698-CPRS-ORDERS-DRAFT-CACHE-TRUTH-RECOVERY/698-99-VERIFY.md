# Phase 698 - CPRS Orders Draft Cache Truth Recovery - Verify

This phase verifies that the Orders panel does not let the draft-cache empty state contradict visible live VistA orders.

## Verification Steps

1. Authenticate with the clinician session using `PRO1234 / PRO1234!!`.
2. Call `GET /vista/cprs/orders?dfn=46` and confirm live VistA orders are returned for the active chart.
3. Open `/cprs/chart/46/orders` in the browser.
4. Confirm the top section still shows the live VistA orders list for the active type.
5. Confirm the lower split-pane no longer says `No med orders in local cache` in a way that could be read as absence of all med orders.
6. Confirm the empty-state text explicitly distinguishes draft/local cache rows from the live VistA orders shown above.
7. Check editor diagnostics for `apps/web/src/components/cprs/panels/OrdersPanel.tsx`.

## Acceptance Criteria

- The Orders panel clearly distinguishes live VistA orders from local draft cache rows.
- Empty draft-cache messaging no longer contradicts the visible live VistA orders list.
- No order actions or routing behavior regress.
