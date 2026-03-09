# Phase 653 - CPRS Telehealth Chart Launch Recovery - Verify

## Verification Steps

1. Confirm the API remains reachable and telehealth provider health is good.
2. Authenticate as a clinician and call:
   - `GET /vista/cprs/appointments?dfn=46`
   - `GET /telehealth/rooms`
   - `GET /telehealth/health`
3. Open `/cprs/chart/46/telehealth` in the browser and verify:
   - the panel shows a real appointment picker/list for launchable appointments
   - an upcoming telehealth appointment can be selected
   - `New Video Visit` is enabled only when a real appointment is selected
4. Create a room from the chart tab and verify:
   - `POST /telehealth/rooms` succeeds with a non-empty `appointmentId`
   - the new room appears in the active room list
5. Join the room from the chart tab and verify the Jitsi join URL loads.
6. End the room and verify the active room list returns to empty.
7. Run diagnostics on the edited panel file.

## Acceptance Criteria

- The Telehealth chart tab no longer has a permanently disabled launch path.
- Room creation is grounded to a real patient appointment, not a synthetic placeholder.
- Existing join/end/waiting-room behavior remains functional.
- The chart tab matches the Phase 30 clinician intent: appointment list to room launch.
