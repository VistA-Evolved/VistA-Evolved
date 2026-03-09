# Phase 702 - CPRS Medications Selection Truth Recovery Verification

## Verification Steps

1. Confirm Docker and the API are running cleanly on the VEHU lane.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/medications?dfn=46` and `GET /vista/medications?dfn=47` to capture the current live medication payloads.
4. Open `/cprs/chart/46/meds` in an authenticated browser session and select a medication.
5. Change the patient context to one with a different live medication list.
6. Confirm the medication detail pane clears if the previous selected medication is not present for the new patient.
7. Run editor diagnostics on `apps/web/src/components/cprs/panels/MedsPanel.tsx`.

## Acceptance Criteria

- The Medications detail pane cannot preserve stale selected-medication state after patient changes or live list refreshes.
- Empty and non-empty medication states remain truthful to the backend route.
- Diagnostics are clean on the touched panel file.
