# Phase 652 - VERIFY: CPRS Labs Workflow Lifecycle Recovery

## Verification Steps

1. Confirm VEHU and platform DB containers are running.
2. Start the API cleanly and verify `/health` and `/vista/ping` return `ok: true`.
3. Log in as `PRO1234 / PRO1234!!` with an authenticated clinician session.
4. Create a workflow lab order for DFN `46`.
5. Record a result against that order and confirm `/lab/results?dfn=46` returns the new result.
6. Confirm `/lab/orders?dfn=46` shows the originating order advanced out of `pending` and has `resultedAt` populated.
7. Confirm `/lab/dashboard` no longer counts that order as `pendingOrders` once a result has been recorded.
8. Confirm the Labs UI reflects the advanced order status after switching back to the Orders view.
9. Run workspace diagnostics on the touched API files.

## Acceptance Criteria

- Recording a lab result does not leave the source order stuck in `pending`.
- The lab dashboard and order list remain internally consistent after result capture.
- Cancelled or missing lab orders cannot silently accept new results.
- Live verification was run against the current API and VEHU environment.
- Runbook and ops artifacts describe the recovered lifecycle truthfully.