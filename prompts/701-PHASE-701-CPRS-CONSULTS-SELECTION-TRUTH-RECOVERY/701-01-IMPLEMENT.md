# Phase 701 - CPRS Consults Selection Truth Recovery

## Goal

Recover truthful Consults panel selection behavior so `/cprs/chart/:dfn/consults` cannot preserve stale consult detail state after live list refreshes or patient changes.

## Implementation Steps

1. Reproduce or inspect the Consults panel state flow in `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`.
2. Confirm the panel fetches live consults from `/vista/consults` and detail text from `/vista/consults/detail`.
3. Add reconciliation so the selected consult is cleared when it is no longer present in the latest live consult list.
4. Reset stale consult detail text and loading state when the selected consult becomes invalid.
5. Preserve the current consult selection only when the selected consult still exists in the refreshed live list.
6. Update the CPRS parity runbook and ops artifacts with the corrected selection contract.

## Files Touched

- `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
