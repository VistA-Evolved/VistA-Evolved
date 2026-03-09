# Phase 721 - CPRS Labs View Continuity Recovery Verify

## Verification Steps

1. Confirm Docker infra and the API are running cleanly before browser testing.
2. Open `/cprs/chart/46/labs`, authenticate as the clinician, and navigate to
   the `Critical Alerts` subview.
3. Reproduce the live workflow: create or load a critical alert, acknowledge it,
   then resolve it.
4. Confirm the Labs panel remains on the `Critical Alerts` subview after the
   workflow refresh instead of falling back to `Results`.
5. Reload the chart while the Labs tab is active and confirm the last selected
   Labs subview for DFN `46` is restored.
6. Switch to a different Labs subview, refresh the workflow, and confirm the
   stored view still remains stable.
7. Validate the edited frontend file has no new TypeScript or lint errors.

## Acceptance Criteria

- Resolving a critical alert no longer drops the clinician into the Results pane.
- Labs subview continuity survives a component remount or page reload.
- First-load behavior still defaults to `Results` when no prior view exists.
- Existing Labs quick-order, workflow, and VistA result behavior remain intact.
