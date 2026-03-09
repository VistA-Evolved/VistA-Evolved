# Phase 721 - CPRS Labs View Continuity Recovery

## Goal

Recover the clinician-facing Labs workflow continuity so resolving or acknowledging
critical alerts does not drop the user back to the default Results pane when the
Labs panel remounts or refreshes. The active Labs subview must remain stable for
the current patient while preserving the existing live VistA and deep-workflow
contracts.

## Implementation Steps

1. Inventory the current Labs panel state handling and confirm that `activeView`
   is stored only in local component state.
2. Confirm the live user-visible defect by reproducing the alert resolution flow
   and observing the panel return to the Results pane.
3. Add a guarded client-side persistence layer for the Labs subview keyed by
   patient DFN so remounts restore the prior view instead of defaulting to
   `results`.
4. Keep the persistence scope narrow to the Labs panel only and avoid changing
   existing workflow route contracts or VistA-backed data loading behavior.
5. Preserve the default `results` view for first-time visits or invalid stored
   values.
6. Validate that the fix does not regress normal tab switching, result selection,
   or refresh behavior.

## Files Touched

- apps/web/src/components/cprs/panels/LabsPanel.tsx
