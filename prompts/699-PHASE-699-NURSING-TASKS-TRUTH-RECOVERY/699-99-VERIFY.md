# Phase 699 - Nursing Tasks Truth Recovery Verification

## Verification Steps

1. Confirm Docker and the API are running cleanly on the VEHU lane.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/nursing/tasks?dfn=46` and capture the live task payload for the patient.
4. Open `/cprs/nursing?dfn=46` in an authenticated browser session.
5. Switch to `Tasks & Reminders` and verify the primary task table matches the live `/vista/nursing/tasks` response.
6. Verify that the local shift safety checklist remains visible only as guidance and is clearly separated from the live patient task table.
7. Force or simulate a partial-load failure if practical and verify the affected section reports the failure instead of silently presenting a misleading healthy or empty state.
8. Run editor diagnostics on `apps/web/src/app/cprs/nursing/page.tsx`.

## Acceptance Criteria

- The standalone nursing Tasks tab no longer presents fabricated patient-specific task rows.
- The primary task table is governed by the live `/vista/nursing/tasks` response.
- Local shift reminders, if shown, are explicitly labeled as local guidance.
- Partial-load failure states are surfaced truthfully.
- Updated runbook and ops artifacts reflect the corrected contract.
