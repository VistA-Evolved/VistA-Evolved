# Phase 651 - CPRS Cover Sheet Appointments Request Hygiene Recovery (IMPLEMENT)

## User Request

Continue the clinician chart audit until the cover sheet behaves like a production clinical system. Fix any appointment rows that are technically returned by the backend but are not clinician-usable in the UI.

## Problem

- `GET /vista/cprs/appointments?dfn=46` returns request-derived rows from the scheduling adapter.
- One of those rows is a locally stored `cancel_request` placeholder with no `clinicName` and no `preferredDate`, so the Cover Sheet renders a junk appointment row with `—` for date and clinic.
- The Cover Sheet also renders legitimate request timestamps as raw ISO strings instead of chart-readable dates.

## Implementation Steps

1. Inspect the scheduling adapter merge path in `apps/api/src/adapters/scheduling/vista-adapter.ts` and confirm how request-store rows are converted into `Appointment` entries.
2. Keep the appointments feed truthful by excluding request placeholders that are not clinician-usable appointment rows, especially `cancel_request` entries with empty date/clinic fields.
3. Preserve legitimate new appointment and reschedule requests in the merged list.
4. Update the Cover Sheet appointments renderer in `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx` so request timestamps display in readable chart format instead of raw ISO strings.
5. Update the scheduling runbook plus ops artifacts after live verification confirms the malformed row is gone and the remaining request rows are readable.

## Verification Steps

1. Confirm Docker, `/health`, and `/vista/ping` are healthy.
2. Login and call `GET /vista/cprs/appointments?dfn=46`.
3. Confirm the response no longer contains the blank cancellation placeholder row.
4. Confirm the remaining request rows still appear with their clinic/date data intact.
5. Verify `/cprs/chart/46/cover` no longer shows the `— / — / request pending / Request` junk row.
6. Verify the Cover Sheet now formats appointment/request dates into human-readable timestamps.

## Files Touched

- `apps/api/src/adapters/scheduling/vista-adapter.ts`
- `apps/web/src/components/cprs/panels/CoverSheetPanel.tsx`
- `docs/runbooks/scheduling-vista-sd.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/651-PHASE-651-CPRS-COVERSHEET-APPOINTMENTS-REQUEST-HYGIENE-RECOVERY/651-01-IMPLEMENT.md`
- `prompts/651-PHASE-651-CPRS-COVERSHEET-APPOINTMENTS-REQUEST-HYGIENE-RECOVERY/651-99-VERIFY.md`