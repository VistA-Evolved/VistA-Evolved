# Phase 709 - Verify CPRS Dialog Draft Truth Recovery

## Goal

Verify that standalone CPRS write dialogs no longer claim draft fallbacks were stored locally when the backend actually stores server-side drafts.

## Verification Checklist

1. Inspect `apps/api/src/routes/cprs/wave2-routes.ts` and confirm these routes return `mode: "draft"` with server-side draft semantics:
   - `POST /vista/cprs/allergies/add`
   - `POST /vista/cprs/problems/add`
   - `POST /vista/cprs/problems/edit`
   - `POST /vista/cprs/vitals/add`
   - `POST /vista/cprs/notes/create`
2. Inspect the following dialogs and confirm their draft-success copy now describes server-side draft storage:
   - `AddAllergyDialog.tsx`
   - `AddProblemDialog.tsx`
   - `EditProblemDialog.tsx`
   - `AddVitalDialog.tsx`
   - `CreateNoteDialog.tsx`
3. Run diagnostics on all touched files and confirm there are no editor errors.
4. Confirm `docs/runbooks/cprs-parity-closure-phase14.md` records the cross-dialog truth contract.

## Acceptance Criteria

- No affected CPRS standalone write dialog claims the draft fallback is stored locally.
- The dialog wording is consistent with the actual server-side draft behavior already implemented in the API.
- The change is documented in the runbook and ops artifacts.