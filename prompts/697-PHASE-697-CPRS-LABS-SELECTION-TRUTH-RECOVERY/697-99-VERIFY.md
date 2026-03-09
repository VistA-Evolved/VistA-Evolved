# Phase 697 - CPRS Labs Selection Truth Recovery - Verify

This phase verifies that the CPRS Labs panel never keeps stale client-side selection state after the latest live VistA lab read has changed.

## Verification Steps

1. Verify Docker and API health before UI checks.
2. Authenticate with the clinician session using `PRO1234 / PRO1234!!`.
3. Call `GET /vista/labs?dfn=46` and confirm the live route returns the current result count for VEHU DFN 46.
4. Open `/cprs/chart/46/labs` in the browser.
5. Confirm the Results tab truthfully shows `0 live result(s)` when the live route is empty.
6. Confirm no stale detail card remains selected when the live result set is empty.
7. Confirm the acknowledge action remains disabled when no live rows are selected.
8. Check editor diagnostics for `apps/web/src/components/cprs/panels/LabsPanel.tsx`.

## Acceptance Criteria

- The Labs panel selection is derived from the latest live result set, not stale client state.
- Empty live result sets clear the selected result and acknowledgement selection.
- The browser no longer risks rendering or acknowledging a stale result after refresh.
- The runbook and ops artifacts record the updated truth contract.
