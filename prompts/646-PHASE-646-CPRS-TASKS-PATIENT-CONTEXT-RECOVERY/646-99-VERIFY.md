# Phase 646 - CPRS Tasks Patient Context Recovery VERIFY

## Verification Steps

1. Confirm runtime health before testing: API ready, VistA reachable, Docker healthy.
2. Call `GET /portal/staff/messages?patientDfn=56`, `GET /portal/staff/refills?patientDfn=56`, and `GET /portal/staff/tasks?patientDfn=56` with an authenticated clinician cookie and verify each response is filtered to patient 56 only.
3. Call the same endpoints without `patientDfn` and verify the broader staff queue contract still works.
4. Open `http://127.0.0.1:3000/cprs/chart/56/tasks` in the live browser and verify the Messages, Refills, and Tasks subtabs only show rows for patient 56.
5. Confirm the chart Tasks tab no longer leaks patient 46 queue entries while viewing patient 56.

## Acceptance Criteria

- The chart-scoped Tasks tab only renders queue rows for the current chart DFN.
- The underlying staff queue endpoints still support the existing unfiltered staff workflow.
- No reply or review control silently disappears for matching patient rows.
- The live browser no longer shows cross-patient data in a single patient chart context.