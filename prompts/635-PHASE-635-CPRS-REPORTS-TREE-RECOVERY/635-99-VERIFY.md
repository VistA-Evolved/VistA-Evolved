# Phase 635 -- VERIFY: CPRS Reports Tree Recovery

## Verification Steps

1. Confirm `/ready` remains healthy and VistA reachable.
2. Confirm `GET /vista/reports?dfn=46` returns a structured catalog.
3. Confirm `GET /vista/reports/text?dfn=46&id=1&hsType=h10` returns a real report.
4. Confirm `GET /vista/reports/text?dfn=46&id=9&range=d7` returns a real date-range report.
5. Open the Reports tab and confirm the report tree renders without duplicated report nodes.
6. Expand Health Summary and confirm subtype options appear once each.
7. Confirm no React duplicate-key console errors occur from the Reports tree.
8. Select a Health Summary subtype and confirm report text loads.
9. Select a date-range report and confirm the range flow still works.

## Acceptance Criteria

- Reports tree shows unique report entries only.
- Health Summary qualifier list is de-duplicated and stable.
- Shared data-cache reports fetch uses the patient-scoped route contract.
- Reports panel still loads real VistA report text and imaging status.

## Files Touched

- `prompts/635-PHASE-635-CPRS-REPORTS-TREE-RECOVERY/635-01-IMPLEMENT.md`
- `prompts/635-PHASE-635-CPRS-REPORTS-TREE-RECOVERY/635-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `apps/web/src/stores/data-cache.tsx`