# Phase 702 - CPRS Medications Selection Truth Recovery

## Goal

Recover truthful Medications panel selection behavior so `/cprs/chart/:dfn/meds` cannot preserve stale medication detail state after live list refreshes or patient changes.

## Implementation Steps

1. Inspect the Medications panel state flow in `apps/web/src/components/cprs/panels/MedsPanel.tsx`.
2. Confirm the panel fetches live medication rows from `/vista/medications`.
3. Add reconciliation so the selected medication is cleared when it is no longer present in the latest live medication list.
4. Preserve the current medication selection only when the selected medication still exists in the refreshed live list.
5. Clear selection on patient change so one patient's medication detail cannot remain visible for another patient.
6. Update the CPRS parity runbook and ops artifacts with the corrected selection contract.

## Files Touched

- `apps/web/src/components/cprs/panels/MedsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
