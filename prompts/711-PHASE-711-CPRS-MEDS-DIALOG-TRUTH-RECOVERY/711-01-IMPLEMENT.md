# Phase 711 - CPRS Meds Dialog Truth Recovery

## User Request

Continue the live clinician-facing CPRS audit and fix user-visible workflow truth defects so the Meds UI matches the verified VistA-first backend behavior.

## Problem Statement

The standalone Add Medication dialog still mixes older quick-order contract language with the recovered Phase 659 behavior. The quick-order section says orders are placed via `ORWDX SEND` even though the current route uses `ORWDXM AUTOACK`, and its draft-success wording does not distinguish the server-side quick-order blocker path from the manual-entry local-only draft path.

## Inventory

### Files inspected

- `apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx`
- `apps/api/src/routes/cprs/wave2-routes.ts`
- `prompts/659-PHASE-659-CPRS-MEDS-QUICK-ORDER-RECOVERY/659-01-IMPLEMENT.md`
- `docs/runbooks/vista-rpc-add-medication.md`

### Existing routes involved

- `POST /vista/cprs/meds/quick-order`

### Existing UI involved

- CPRS Meds panel quick-order modal
- CPRS Meds panel manual-entry modal path

### Exact files to change

- `apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx`
- `docs/runbooks/vista-rpc-add-medication.md`
- `ops/summary.md`
- `ops/notion-update.json`

## Implementation Steps

1. Align the quick-order dialog text with the recovered Phase 659 contract: `ORWDXM AUTOACK`, not `ORWDX SEND`.
2. Update the quick-order draft wording to describe server-side draft storage when that branch is reached.
3. Update the manual-entry wording so it explicitly remains a local-only draft path.
4. Document the distinction between quick-order server-side draft blockers and manual local-only drafts.

## Verification Steps

1. Confirm `POST /vista/cprs/meds/quick-order` in `wave2-routes.ts` still uses `ORWDXM AUTOACK`.
2. Confirm the route's blocker message remains server-side draft wording.
3. Confirm the dialog now describes quick-order and manual-entry draft paths truthfully and distinctly.
4. Run diagnostics on all touched files.