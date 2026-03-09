# Phase 643 - CPRS Reports Qualifier Dedup Stability

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or unstable panel behavior by checking prompt lineage and fixing the actual clinician-facing result.

## Defect

- Reloading the Reports tab still triggers duplicate React key warnings in the Health Summary qualifier subtree.
- The browser snapshot shows the report tree becoming corrupted, with Health Summary subtype rendering bleeding into unrelated report nodes.
- The current `normalizeQualifierOptions()` logic preserves duplicate qualifier IDs when the raw line or label differs, while the rendered key still uses `option.id`.

## Inventory

- Inspected files:
  - `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
  - `prompts/635-PHASE-635-CPRS-REPORTS-TREE-RECOVERY/635-01-IMPLEMENT.md`
  - `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-01-IMPLEMENT.md`

## Implementation Steps

1. Tighten report qualifier normalization so duplicate IDs collapse to a single rendered option.
2. Use stable composite React keys tied to the underlying raw qualifier token instead of just `option.id`.
3. Reload the Reports tab and confirm the duplicate-key warning disappears and the tree remains visually stable.

## Files Touched

- `prompts/643-PHASE-643-CPRS-REPORTS-QUALIFIER-DEDUP-STABILITY/643-01-IMPLEMENT.md`
- `prompts/643-PHASE-643-CPRS-REPORTS-QUALIFIER-DEDUP-STABILITY/643-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`