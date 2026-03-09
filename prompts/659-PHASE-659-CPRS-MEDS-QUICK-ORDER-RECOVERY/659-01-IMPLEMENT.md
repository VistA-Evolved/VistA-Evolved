# Phase 659 - CPRS Meds Quick-Order Recovery

## User Request

- Continue the live CPRS chart audit until clinician workflows are production-grade and fully truthful.
- Fix the newly discovered Meds quick-order defect where placing a medication quick order leaks raw VistA AUTOACK runtime text instead of creating a truthful order result.

## Implementation Steps

1. Reproduce the live Meds quick-order failure from the CPRS chart and direct API calls against DFN `46`.
2. Trace `POST /vista/cprs/meds/quick-order` and compare its `ORWDXM AUTOACK` parameter contract against the grounded add-medication and lab/imaging quick-order implementations.
3. Correct the AUTOACK call contract so medication quick orders use the same required location-aware parameter shape as the verified routes.
4. Reject raw MUMPS/runtime AUTOACK payloads as failures instead of reporting them as successful orders.
5. Update the Meds dialog so real successes show the route’s clinician-safe message instead of falling back to raw response text.
6. Preserve truthful behavior: if VistA still does not create a live order, return a clean blocker state and never leak raw broker text to the clinician.

## Files Touched

- apps/api/src/routes/cprs/wave2-routes.ts
- apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx
- docs/runbooks/vista-rpc-add-medication.md
- ops/summary.md
- ops/notion-update.json
