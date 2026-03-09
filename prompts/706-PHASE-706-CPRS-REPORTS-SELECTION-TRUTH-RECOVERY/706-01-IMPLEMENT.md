# Phase 706 - CPRS Reports Selection Truth Recovery

## User request

Continue the live clinician audit and fix the next real CPRS truth defect so the chart remains fully functional, VistA-first, and truthful from the end-user perspective.

## Problem statement

The Reports panel preserved selected report, qualifier, and rendered text state locally with no reconciliation against refreshed live `/vista/reports` catalog data. That could leave stale report context visible after a live catalog change or invalid qualifier state.

## Implementation steps

1. Inspect the Reports panel selected report, qualifier, and text-loading behavior.
2. Reconcile the selected report against the refreshed live report catalog.
3. Reconcile Health Summary and date-range qualifiers against the current live option lists.
4. Clear selected report and rendered text state when the selected report or qualifier is no longer valid.
5. Update the CPRS parity runbook with the Reports selection truth contract.
6. Update ops artifacts for this recovery.

## Files expected to change

- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`