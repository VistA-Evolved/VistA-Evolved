# Phase 641 - CPRS Surgery List Stability Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or incomplete workflows by checking prompt lineage and fixing the actual clinician-facing behavior.

## Defect

- During live Surgery verification on DFN 69, selecting a real surgical case caused the left-side surgery list to collapse into `No surgical cases on file` even though the selected case detail remained visible on the right.
- The defect is user-facing and reproducible in the DOM, not just in the browser snapshot.
- Clinicians must retain the visible surgery case list while reviewing a selected case.

## Inventory

- Inspected files:
  - `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`
  - `apps/web/src/stores/data-cache.tsx`
- Existing UI involved:
  - Surgery case table
  - Surgery detail pane

## Implementation Steps

1. Preserve the last known non-empty surgery case list locally inside the panel.
2. Render that stable list while a case is selected, even if the live cache temporarily falls back to an empty array.
3. Keep true empty-state behavior for patients who genuinely have no surgery cases.
4. Re-run the DFN 69 surgery selection flow and confirm the left table remains populated while the right detail pane updates.

## Files Touched

- `prompts/641-PHASE-641-CPRS-SURGERY-LIST-STABILITY-RECOVERY/641-01-IMPLEMENT.md`
- `prompts/641-PHASE-641-CPRS-SURGERY-LIST-STABILITY-RECOVERY/641-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`