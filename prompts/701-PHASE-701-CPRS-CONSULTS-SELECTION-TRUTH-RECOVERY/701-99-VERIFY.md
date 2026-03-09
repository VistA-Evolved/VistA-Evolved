# Phase 701 - CPRS Consults Selection Truth Recovery Verification

## Verification Steps

1. Confirm Docker and the API are running cleanly on the VEHU lane.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/consults?dfn=46` and capture the current live consult payload.
4. Open `/cprs/chart/46/consults` in an authenticated browser session.
5. Confirm the panel empty state and detail pane match the live route when there are zero consults.
6. For a patient with consult rows, select a consult, refresh the list or change the patient context, and confirm the detail pane clears if the selected consult no longer exists in the live list.
7. Run editor diagnostics on `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`.

## Acceptance Criteria

- The Consults detail pane cannot preserve stale selected-consult state after live list refreshes.
- Empty-state UI remains truthful for zero-consult patients.
- Stale detail text and loading state are cleared when selection becomes invalid.
- Diagnostics are clean on the touched panel file.
