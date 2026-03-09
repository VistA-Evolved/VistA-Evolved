# Phase 689 - CPRS Labs Order Action Truth Recovery

## Goal
Recover clinician-visible Labs Orders view defects where primary order-entry actions appear clickable even when their required input fields are empty.

## Problem Statement
The Labs Orders view currently exposes both `Submit VistA Request` and `Create Workflow Order` as enabled primary actions on initial render.
Their handlers immediately return when the required test-name fields are blank, so the clicks silently no-op.
That is dead-click behavior because the interface advertises order-entry actions before the user has provided the minimum required data.

## Implementation Steps
1. Confirm the live browser posture on `/cprs/chart/46/labs` → Orders with empty inputs.
2. Patch `apps/web/src/components/cprs/panels/LabsPanel.tsx` so both order-entry actions are disabled until their required text inputs are populated.
3. Preserve the existing request/create behavior once the required input is present.
4. Update the relevant CPRS parity runbook and ops tracking artifacts with the verified UI contract.

## Files Touched
- `prompts/689-PHASE-689-CPRS-LABS-ORDER-ACTION-TRUTH-RECOVERY/689-01-IMPLEMENT.md`
- `prompts/689-PHASE-689-CPRS-LABS-ORDER-ACTION-TRUTH-RECOVERY/689-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/LabsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`