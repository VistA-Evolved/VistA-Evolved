# Phase 648 - IMPLEMENT: CPRS Notes Status Truthfulness Recovery

## User Request

- Continue the live clinician chart audit and fix the next real user-facing CPRS defect.
- Keep the frontend aligned with live VistA behavior instead of allowing misleading chart labels.
- Preserve the existing VistA-first notes routes and repair the UI at the true point of failure.

## Problem

The CPRS Notes panel marks live TIU notes as `Signed` when their backend status is actually `unsigned`. In DFN 46, note `14349` returns `status:"unsigned"` from `GET /vista/notes?dfn=46`, and `GET /vista/tiu-text?id=14349` returns body text showing `STATUS: UNSIGNED`, but the chart still renders the note as signed.

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/NotesPanel.tsx`
- Inspected: `docs/runbooks/vista-rpc-notes.md`
- Inspected: `prompts/608-PHASE-608-CPRS-NOTES-PANEL-TRUTHFULNESS-RECOVERY/608-01-IMPLEMENT.md`
- Verified live routes: `GET /vista/notes?dfn=46`, `GET /vista/tiu-text?id=14349`

## Implementation Steps

1. Confirm whether the notes status mismatch is frontend-only or caused by inconsistent backend route output.
2. Fix the Notes panel status classifier so `unsigned` and `uncosigned` are recognized before any generic `signed` substring match.
3. Reuse the same corrected classifier for the selected-note Sign action gate so unsigned notes remain signable.
4. Update the notes runbook so the Notes panel truthfulness contract documents the unsigned-before-signed requirement.
5. Record the recovery in ops artifacts.

## Verification Steps

1. Verify Docker and API health.
2. Log into the API and confirm note `14349` is `unsigned` in `/vista/notes?dfn=46`.
3. Confirm `/vista/tiu-text?id=14349` includes `STATUS: UNSIGNED`.
4. Open `/cprs/chart/46/notes` in the clinician UI and confirm the note is labeled `Unsigned`.
5. Confirm the Notes panel has no new editor diagnostics.

## Files Touched

- `apps/web/src/components/cprs/panels/NotesPanel.tsx`
- `docs/runbooks/vista-rpc-notes.md`
- `ops/summary.md`
- `ops/notion-update.json`
