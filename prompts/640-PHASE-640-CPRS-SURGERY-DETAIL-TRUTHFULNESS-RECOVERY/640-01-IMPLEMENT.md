# Phase 640 - CPRS Surgery Detail Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or incomplete workflows by checking prompt lineage and fixing the actual clinician-facing behavior.

## Defect

- Live Surgery audit on DFN 69 showed that `GET /vista/surgery/detail?id=10021&dfn=69` can return a raw VistA runtime error from `ORWSR ONECASE`.
- Current backend behavior still returns `ok: true` with empty `text` and `detail`, which makes the Surgery panel present that runtime failure as a benign “No operative note text resolved” state.
- Clinicians need a truthful failure state when surgery detail did not actually load.

## Inventory

- Inspected files:
  - `apps/api/src/server/inline-routes.ts`
  - `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`
- Existing routes involved:
  - `GET /vista/surgery`
  - `GET /vista/surgery/detail`
- Existing UI involved:
  - Surgery case detail pane
  - Operative report / linked note resolution messaging

## Implementation Steps

1. Update `GET /vista/surgery/detail` so that if `ORWSR ONECASE` still has a VistA execution error after sibling fallback, the route returns `ok: false` with a truthful error message instead of an empty success payload.
2. Preserve `rawCase` and `rpcUsed` metadata so the failure remains diagnosable.
3. Re-run the Surgery tab against a patient with real surgery data and confirm the UI now shows a truthful unavailable/error state instead of a fake empty-success message.

## Files Touched

- `prompts/640-PHASE-640-CPRS-SURGERY-DETAIL-TRUTHFULNESS-RECOVERY/640-01-IMPLEMENT.md`
- `prompts/640-PHASE-640-CPRS-SURGERY-DETAIL-TRUTHFULNESS-RECOVERY/640-99-VERIFY.md`
- `apps/api/src/server/inline-routes.ts`