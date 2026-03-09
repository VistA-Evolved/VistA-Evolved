# Phase 594 — Discharge Prep + Med Rec TIU Completion

## Objective

Turn the inpatient discharge path into a usable discharge-prep workflow instead of a sandbox blocker modal. Keep PSO/PSJ and DG ADT truthfully integration-pending, but add a real clinician flow for medication reconciliation, discharge checklist management, and TIU-backed summary documentation that works today against VEHU.

## Implementation Steps

1. Inventory the inpatient UI, med-rec routes, discharge routes, and existing TIU writeback executor before editing.
2. Confirm live VEHU RPC availability for `PSO UPDATE MED LIST`, `PSJ LM ORDER UPDATE`, `DG ADT DISCHARGE`, and `TIU CREATE RECORD` so the contract remains truthful.
3. Extend medication reconciliation completion to support TIU-backed summary-note creation and to return explicit integration metadata for the unavailable PSO/PSJ targets.
4. Extend discharge planning so a plan can reference a med-rec session, keep checklist state aligned with that session, and create a TIU-backed discharge-prep note while still leaving DG ADT discharge truthful integration-pending.
5. Replace the inpatient discharge dead-end UI with a real discharge-prep surface that can start med-rec, capture decisions, manage the checklist, and finalize TIU documentation through the same backend contract.
6. Live-test the full clinician flow with DFN `46`, including TIU draft creation and note retrieval from VistA.
7. Update the inpatient-depth runbook plus ops artifacts with the verified behavior and remaining truthful sandbox limits.

## Files Touched

- apps/api/src/routes/med-reconciliation.ts
- apps/api/src/routes/discharge-workflow.ts
- apps/web/src/app/cprs/inpatient/page.tsx
- docs/runbooks/phase168-inpatient-depth.md
- ops/summary.md
- ops/notion-update.json