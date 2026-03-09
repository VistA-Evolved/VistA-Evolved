# Phase 705 - CPRS D/C Summary Selection Truth Recovery

## User request

Continue the live clinician audit and fix the next real CPRS truth defect so the chart remains fully functional, VistA-first, and truthful from the end-user perspective.

## Problem statement

The D/C Summary panel preserved selected summary and full-text state locally with no reconciliation against refreshed live `/vista/dc-summaries` data. That could leave a stale discharge summary visible after the live TIU list changed or after a patient switch.

## Implementation steps

1. Inspect the D/C Summary panel selection and text-loading behavior.
2. Add patient-change reset for selected summary and loaded text state.
3. Reconcile the selected summary against the refreshed live summary list.
4. Clear selected summary and text state when the selected TIU summary is no longer present.
5. Update the CPRS parity runbook with the D/C Summary selection truth contract.
6. Update ops artifacts for this recovery.

## Files expected to change

- `apps/web/src/components/cprs/panels/DCSummPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`