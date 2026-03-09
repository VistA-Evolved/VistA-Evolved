# Phase 635 -- IMPLEMENT: CPRS Reports Tree Recovery

## Goal

Recover the Reports panel tree so it renders a clean, stable VistA report catalog without duplicate nodes or React key errors.

## Implementation Steps

1. Verify live backend behavior for `/vista/reports`, `/vista/reports/text`, and related imaging status routes.
2. Compare the panel-specific reports fetch with the shared cache reports fetcher.
3. Correct the shared cache fetcher to use the same patient-scoped reports route contract.
4. Normalize and dedupe report definitions in the Reports panel before grouping and rendering.
5. Normalize and dedupe Health Summary and date-range qualifier options before rendering.
6. Preserve the existing VistA-first Reports and Imaging behavior while removing duplicate-key warnings and duplicated UI nodes.

## Files Touched

- `prompts/635-PHASE-635-CPRS-REPORTS-TREE-RECOVERY/635-01-IMPLEMENT.md`
- `prompts/635-PHASE-635-CPRS-REPORTS-TREE-RECOVERY/635-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `apps/web/src/stores/data-cache.tsx`

## Notes

- Live report text requests are working against DFN 46.
- The visible defect is a frontend render/data-normalization issue, not a missing VistA contract.
- The shared cache fetcher was not passing `dfn` to `/vista/reports`, which diverged from the panel's intended contract.