# Phase 653 - CPRS Telehealth Chart Launch Recovery

## User request

Continue the live CPRS chart audit until the clinician UI works truthfully end to end, uses VistA-first behavior where available, and finish incomplete AI-built workflows instead of leaving blocked placeholders.

## Problem observed live

During the live chart audit of the Telehealth tab for DFN=46, the clinician panel could never create a video visit even though the backend telehealth routes were healthy and the patient had real appointment data available in the chart.

Observed live:

- `GET /vista/cprs/appointments?dfn=46` returned multiple real appointment records, including upcoming `Telehealth Clinic` entries.
- `GET /telehealth/health` returned `healthy:true` with provider `Jitsi`.
- `GET /telehealth/rooms` returned an empty but healthy room list.
- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx` hardcoded `const canCreateRoom = false` and sent `appointmentId = ''`, making the clinician launch path permanently disabled.

This left the chart tab below the intended Phase 30 design of `appointment list -> join room` on the clinician side.

## Inventory first

Files inspected:

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`
- `apps/api/src/routes/telehealth.ts`
- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `prompts/32-PHASE-30-TELEHEALTH/32-01-telehealth-IMPLEMENT.md`

Existing routes/endpoints involved:

- `GET /vista/cprs/appointments?dfn=46`
- `GET /telehealth/rooms`
- `GET /telehealth/health`
- `POST /telehealth/rooms`
- `POST /telehealth/rooms/:roomId/join`
- `POST /telehealth/rooms/:roomId/end`
- `GET /telehealth/rooms/:roomId/waiting`

Existing UI involved:

- `TelehealthPanel`
- Chart tab route `/cprs/chart/:dfn/telehealth`

Exact files to change:

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`

## Implementation Steps

1. Add a live appointment fetch in the Telehealth chart panel using the existing chart appointments route.
2. Normalize the appointment payload needed for room creation and display.
3. Filter/select launchable appointments for the current patient, prioritizing telehealth-labeled upcoming appointments.
4. Replace the hardcoded disabled create path with a real selected `appointmentId` sent to `POST /telehealth/rooms`.
5. Keep the existing active-room join/end behavior unchanged.
6. Re-verify in the browser and via live HTTP calls against the running API.

## Files touched

- `apps/web/src/components/cprs/panels/TelehealthPanel.tsx`
- `prompts/653-PHASE-653-CPRS-TELEHEALTH-CHART-LAUNCH-RECOVERY/653-01-IMPLEMENT.md`
- `prompts/653-PHASE-653-CPRS-TELEHEALTH-CHART-LAUNCH-RECOVERY/653-99-VERIFY.md`
