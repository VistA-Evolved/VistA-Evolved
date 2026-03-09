# Phase 704 - CPRS Surgery Selection Truth Recovery

## User request

Continue the live clinician audit and fix the next real CPRS truth defect so the UI remains fully functional, VistA-first, and truthful from the end-user perspective.

## Problem statement

The Surgery panel preserved stale case rows through a local `stableCases` fallback. That meant a previously selected surgery could remain visible even after the latest live `/vista/surgery` payload no longer contained that case.

## Implementation steps

1. Inspect the Surgery panel selection and list-reconciliation behavior.
2. Remove any stale client-side list fallback that can outlive the live VistA surgery list.
3. Reconcile the selected case against the refreshed live case list.
4. Clear selection and detail state when the selected surgery case is no longer present.
5. Update the CPRS parity runbook with the surgery selection truth contract.
6. Update ops artifacts for this recovery.

## Files expected to change

- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`