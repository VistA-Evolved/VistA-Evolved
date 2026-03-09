# Phase 598 — Inpatient Workspace Recovery

## Objective

Restore clinician continuity in the inpatient ADT and discharge-prep workspace by wiring the existing medication reconciliation and discharge-plan list APIs into the UI. The user must be able to reopen in-progress work after a refresh instead of starting over.

## Implementation Steps

1. Inventory the current inpatient ADT workspace and the existing recovery-capable API routes.
2. Reuse the existing `/vista/med-rec/sessions`, `/vista/med-rec/session/:id`, `/vista/discharge/plans`, and `/vista/discharge/plan/:id` endpoints rather than inventing new storage or duplicate flows.
3. Add recent-session and recent-plan loading controls to the inpatient UI for the active DFN.
4. Refresh those recovery lists after workflow mutations so the UI reflects newly created or completed work immediately.
5. Keep the posture truthful: TIU draft creation remains live, DG ADT movement and PSO/PSJ writeback remain integration-pending.
6. Update the inpatient runbook and ops artifacts so this recovery behavior is documented and traceable.

## Files Touched

- `apps/web/src/app/cprs/inpatient/page.tsx`
- `docs/runbooks/phase168-inpatient-depth.md`
- `ops/summary.md`
- `ops/notion-update.json`