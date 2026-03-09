# Phase 639 - CPRS Consult Status Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover misleading or incomplete workflows by checking prompt lineage and fixing the actual clinician-facing behavior.

## Defect

- Live Consults audit on DFN 69 showed that `GET /vista/consults` returns raw VistA status codes such as `c`, `dc`, `pr`, and `a` directly into the UI.
- The Consults panel displays those raw codes to clinicians instead of readable status labels.
- The `Pending` and `Complete` filters are effectively broken because they match English words while the backing data is still abbreviated status codes.

## Inventory

- Inspected files:
  - `apps/api/src/server/inline-routes.ts`
  - `apps/web/src/stores/data-cache.tsx`
  - `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`
- Existing routes involved:
  - `GET /vista/consults`
  - `GET /vista/consults/detail`
- Existing UI involved:
  - Consults list table
  - Consult status badge rendering
  - Consult filter dropdown

## Implementation Steps

1. Normalize consult status codes in `GET /vista/consults` so the API returns clinician-readable labels while preserving the raw VistA code.
2. Add a consult status category so the frontend can apply `Pending` and `Complete` filters truthfully against live data.
3. Update the Consults panel to use the normalized category for filters and badge styling.
4. Re-run the Consults tab against both an empty patient and a patient with real consult data, then verify detail loading still matches live VistA output.

## Files Touched

- `prompts/639-PHASE-639-CPRS-CONSULT-STATUS-TRUTHFULNESS-RECOVERY/639-01-IMPLEMENT.md`
- `prompts/639-PHASE-639-CPRS-CONSULT-STATUS-TRUTHFULNESS-RECOVERY/639-99-VERIFY.md`
- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`
- `apps/web/src/components/cprs/panels/ConsultsPanel.tsx`