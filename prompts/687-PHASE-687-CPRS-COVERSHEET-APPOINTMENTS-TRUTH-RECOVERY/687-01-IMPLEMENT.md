# Phase 687 - CPRS Cover Sheet Appointments Truth Recovery - IMPLEMENT

## User Request

Continue the live clinician audit until the CPRS chart behaves like a truthful,
production clinical system. Fix any remaining cover sheet workflow that still
shows local placeholder/request workflow state as if it were live VistA chart
data.

## Problem

- The CPRS Cover Sheet appointments card is currently rendering request-store
  scheduling rows like `request pending` and `request approved` as if they were
  chart appointments.
- `GET /vista/cprs/appointments?dfn=46` delegates to the scheduling adapter's
  merged encounter/request feed, even though the adapter already exposes the
  CPRS-specific `ORWPT APPTLST` path for the cover sheet.
- This regresses the Phase 601 VistA-first contract and leaves the chart using
  operational request workflow data instead of appointment truth.

## Implementation Steps

1. Inventory the current cover sheet appointments route, panel contract, and
   scheduling adapter methods to confirm the chart is calling the merged
   request feed instead of the CPRS-specific appointment read path.
2. Update `GET /vista/cprs/appointments?dfn=` so the cover sheet uses
   `getAppointmentsCprs()` and returns chart-safe rows grounded to
   `ORWPT APPTLST` only.
3. Preserve truthful empty and pending posture when CPRS appointments are not
   available, but do not surface request-store scheduling workflow rows on the
   cover sheet.
4. Update the Cover Sheet appointments card copy so its target RPC and empty
   state reflect appointment truth rather than request workflow state.
5. Verify the route and live cover sheet in VEHU, then update the scheduling
   runbook and ops artifacts with the proof.

## Files Touched

- prompts/687-PHASE-687-CPRS-COVERSHEET-APPOINTMENTS-TRUTH-RECOVERY/687-01-IMPLEMENT.md
- prompts/687-PHASE-687-CPRS-COVERSHEET-APPOINTMENTS-TRUTH-RECOVERY/687-99-VERIFY.md
- apps/api/src/routes/cprs/wave1-routes.ts
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- docs/runbooks/scheduling-vista-sd.md
- ops/summary.md
- ops/notion-update.json