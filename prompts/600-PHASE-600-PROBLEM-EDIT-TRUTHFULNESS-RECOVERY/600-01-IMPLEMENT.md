# Phase 600 - Problem Edit Truthfulness Recovery

## Context

- User request: continue autonomously, keep the full UI working end to end, stay VistA-first, and inspect phase lineage before changing pending or stale workflows.
- Problem discovered after Phase 599 closeout: the CPRS problem edit workflow mixes truthful and stale behavior.
- Backend route `POST /vista/cprs/problems/edit` reports `mode: 'real'` on any RPC output and does not reject VistA runtime-error payloads.
- Frontend dialog `EditProblemDialog.tsx` still carries blocker-era fallback assumptions and, on draft fallback, appends a new local problem-style row instead of staging an edit to the existing item.

## Implementation Steps

1. Inventory the affected files and confirm prompt lineage from prior problem-list and problem-write phases.
2. Normalize problem edit status values before calling `ORQQPL EDIT SAVE` so UI values map to VistA-safe values.
3. Make the edit route treat VistA runtime-error output as a failed live write and fall back truthfully to draft mode.
4. Fix the edit dialog fallback path so it updates local UI state truthfully instead of creating a duplicate pseudo-problem.
5. Keep changes minimal and limited to the active problem edit workflow.

## Inventory

- Files inspected:
  - `apps/api/src/routes/cprs/wave2-routes.ts`
  - `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
  - `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx`
  - `apps/web/src/stores/data-cache.tsx`
  - `apps/api/src/routes/problems.ts`
  - `prompts/578-W42-P7-WIRE-STUBS-PROBLEMS-MEDS/578-01-IMPLEMENT.md`
  - `prompts/599-PHASE-599-PATIENT-SEARCH-PROBLEM-WRITE-RECOVERY/599-01-IMPLEMENT.md`
- Existing routes/endpoints involved:
  - `POST /vista/cprs/problems/edit`
  - `POST /vista/cprs/problems/add`
  - `GET /vista/problems`
- Existing UI/components involved:
  - `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
  - `apps/web/src/components/cprs/panels/ProblemsPanel.tsx`
  - `apps/web/src/stores/data-cache.tsx`
- Exact files expected to change:
  - `apps/api/src/routes/cprs/wave2-routes.ts`
  - `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`

## Files Touched

- `apps/api/src/routes/cprs/wave2-routes.ts`
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
- `ops/summary.md`
- `ops/notion-update.json`

## Verification Plan

1. Confirm Docker containers remain healthy and API health stays green.
2. Log in against the local API using VEHU credentials.
3. Call the live problem edit route with DFN `46` and a known problem IEN from the patient problem list.
4. Verify the response is truthful:
   - real success returns `ok: true`, `mode: 'real'`
   - VistA runtime error falls back to `mode: 'draft'` rather than fake live success
5. Run `scripts/verify-latest.ps1` after the code change.
