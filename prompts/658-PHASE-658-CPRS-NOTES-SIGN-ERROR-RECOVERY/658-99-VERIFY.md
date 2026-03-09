# Phase 658 - CPRS Notes Sign Error Recovery Verify

## Verification Steps

1. Start from an authenticated CPRS Notes route for DFN `46`.
2. Confirm the live notes list and note-text viewer still load from TIU after the recovery patch.
3. Reproduce a failed sign attempt on an unsigned note using `PRO1234!!` as the e-signature input.
4. Confirm the sign dialog reports a clean blocker message such as `Incorrect electronic signature code. Try again.` instead of mangled raw VistA output.
5. Confirm the failed attempt does not change the note into a signed state.
6. Check workspace diagnostics for the touched frontend and backend files.

## Acceptance Criteria

- Failed TIU sign attempts no longer expose raw broker or routine text to the clinician UI.
- The Notes panel handles structured sign-blocked and sign-failed responses consistently with existing CPRS sign workflows.
- Failed note-sign attempts remain truthful and leave the note unsigned.
- The live Notes list and note-text flows still work after the fix.
- No new relevant diagnostics are introduced in the touched files.

## Files Touched

- apps/api/src/routes/cprs/tiu-notes.ts
- apps/web/src/components/cprs/panels/NotesPanel.tsx
- docs/clinical/writeback-scope-matrix.md
- ops/summary.md
- ops/notion-update.json