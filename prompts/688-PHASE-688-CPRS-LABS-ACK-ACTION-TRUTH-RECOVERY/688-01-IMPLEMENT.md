# Phase 688 - CPRS Labs Acknowledge Action Truth Recovery

## Goal
Recover a clinician-visible Labs panel defect where the primary Acknowledge action appears available even when there are zero live lab results or no selected acknowledgement targets.

## Problem Statement
The CPRS Labs panel currently renders an enabled primary `Acknowledge` button whenever the Results view is visible.
For patients such as DFN 46 in the VEHU lane, the live labs route returns `ok:true`, `count:0`, and no selectable results.
Clicking the enabled action only produces `Select one or more results to acknowledge.`
That is dead-click behavior and not truthful UX because the panel advertises a write action before the user has any valid acknowledgement target.

## Implementation Steps
1. Confirm the live Labs route and browser panel posture for DFN 46.
2. Patch `apps/web/src/components/cprs/panels/LabsPanel.tsx` so the primary Acknowledge action is disabled until at least one result is selected.
3. Preserve the existing acknowledgement flow when selectable live results exist.
4. Update the relevant CPRS parity runbook and ops tracking artifacts with the verified UI contract.

## Files Touched
- `prompts/688-PHASE-688-CPRS-LABS-ACK-ACTION-TRUTH-RECOVERY/688-01-IMPLEMENT.md`
- `prompts/688-PHASE-688-CPRS-LABS-ACK-ACTION-TRUTH-RECOVERY/688-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/LabsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`