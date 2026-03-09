# Phase 642 - CPRS Reports Local-Only Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or incomplete workflows by checking prompt lineage and fixing the actual clinician-facing behavior.

## Defect

- Live Reports audit on DFN 46 showed that catalog entries marked `local only` still go through `GET /vista/reports/text`.
- The backend returns `ok:true` with empty text for those report IDs, and the UI would present a blank report viewer instead of an explicit local-only limitation.
- Clinicians need a truthful local-only message for entries such as `Procedures (local only)` and `Surgery (local only)`.

## Inventory

- Inspected files:
  - `apps/api/src/server/inline-routes.ts`
  - `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
  - `prompts/611-PHASE-611-CPRS-REPORTS-TREE-QUALIFIER-PARITY/611-01-IMPLEMENT.md`
- Existing routes involved:
  - `GET /vista/reports`
  - `GET /vista/reports/text`
- Existing UI involved:
  - Reports tree
  - Report viewer pane

## Implementation Steps

1. Add a local-only guard in `GET /vista/reports/text` so known local-only report IDs return a structured local-only response instead of an empty live-text success.
2. Update the Reports panel so selecting a local-only report shows a clear local-only explanation and does not attempt the live text fetch.
3. Re-run the Reports tab and direct API calls for a local-only report and a normal live report to verify truthfulness without regressing real `ORWRP REPORT TEXT` behavior.

## Files Touched

- `prompts/642-PHASE-642-CPRS-REPORTS-LOCAL-ONLY-TRUTHFULNESS-RECOVERY/642-01-IMPLEMENT.md`
- `prompts/642-PHASE-642-CPRS-REPORTS-LOCAL-ONLY-TRUTHFULNESS-RECOVERY/642-99-VERIFY.md`
- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`