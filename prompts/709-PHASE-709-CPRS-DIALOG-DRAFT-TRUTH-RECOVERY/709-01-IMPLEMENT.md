# Phase 709 - CPRS Dialog Draft Truth Recovery

## User Request

Continue the clinician-facing CPRS audit and fix user-visible truth defects so the UI matches the actual VistA-first backend behavior.

## Problem Statement

Several standalone CPRS write dialogs still report that fallback saves were stored locally even though the current write routes return server-side draft contracts. This creates a clinician-facing truth drift between the modal copy and the real API behavior.

## Inventory

### Files inspected

- `apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx`
- `apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx`
- `apps/api/src/routes/cprs/wave2-routes.ts`
- `docs/runbooks/cprs-parity-closure-phase14.md`

### Existing routes involved

- `POST /vista/cprs/allergies/add`
- `POST /vista/cprs/problems/add`
- `POST /vista/cprs/problems/edit`
- `POST /vista/cprs/vitals/add`
- `POST /vista/cprs/notes/create`

### Existing UI components involved

- Allergy add dialog
- Problem add dialog
- Problem edit dialog
- Vital add dialog
- Note create dialog

### Exact files to change

- `apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx`
- `apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx`
- `apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`

## Implementation Steps

1. Replace stale `local` draft-success state labels in the affected dialogs with `draft`.
2. Update success-copy and header comments so they describe server-side draft fallback rather than local-only save behavior.
3. Extend the CPRS parity closure runbook with a cross-dialog truth contract for CPRS standalone write modals.
4. Update ops artifacts to record the Phase 709 recovery step.

## Verification Steps

1. Confirm the relevant write routes in `wave2-routes.ts` return `mode: "draft"` with explicit server-side draft wording.
2. Run editor diagnostics on all touched files.
3. Search the updated dialogs to confirm the stale `local draft` clinician-facing copy is removed.
4. Verify the runbook and ops artifacts reflect the new phase.