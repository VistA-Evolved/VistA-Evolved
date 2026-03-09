# Phase 690 - CPRS Labs Specimen/Result Action Truth Recovery

## Goal
Recover the remaining clinician-visible dead actions in the CPRS Labs workflow by disabling Specimen and Result creation actions until their required inputs are present.

## Problem Statement
The Labs panel still exposes enabled primary actions for `Create Specimen` and `Record Result` even when their required fields are blank.
In the live browser on `/cprs/chart/46/labs`, both buttons are clickable despite no order being selected and no required accession/analyte/value fields being present.
Their handlers immediately return without feedback, which is dead-click behavior and not truthful UX.

## Implementation Steps
1. Confirm the live browser posture for the Specimens and Critical Alerts views on `/cprs/chart/46/labs`.
2. Patch `apps/web/src/components/cprs/panels/LabsPanel.tsx` so `Create Specimen` stays disabled until order + accession number are present.
3. Patch the same panel so `Record Result` stays disabled until order + analyte + value are present.
4. Update the CPRS parity runbook and ops tracking artifacts with the corrected UI contract.

## Files Touched
- `prompts/690-PHASE-690-CPRS-LABS-SPECIMEN-RESULT-ACTION-TRUTH-RECOVERY/690-01-IMPLEMENT.md`
- `prompts/690-PHASE-690-CPRS-LABS-SPECIMEN-RESULT-ACTION-TRUTH-RECOVERY/690-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/LabsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`