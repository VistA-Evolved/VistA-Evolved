# Phase 658 - CPRS Notes Sign Error Recovery

## User Request

- Continue the live CPRS chart audit until clinician workflows are production-grade and fully truthful.
- Fix the newly discovered Notes sign defect where failed TIU electronic-signature attempts surface mangled raw VistA text in the UI.

## Implementation Steps

1. Reproduce the live Notes sign failure from the CPRS chart against an unsigned TIU note for DFN `46`.
2. Trace the sign error path from the Notes panel through `POST /vista/cprs/notes/sign` and confirm whether raw `TIU SIGN RECORD` output is being passed through unchanged.
3. Add a focused backend normalizer for known TIU sign failures so incorrect e-signature attempts return structured blocker states and clean clinician-readable messages.
4. Update the Notes panel to honor structured sign failure statuses instead of prefixing raw API text with a generic `Error:` label.
5. Preserve truthful behavior: failed sign attempts must still leave the note unsigned and must not fake success.

## Verification Steps

1. Open an authenticated `http://127.0.0.1:3000/cprs/chart/46/notes` session.
2. Select a live unsigned TIU note and open the sign dialog.
3. Attempt signing with the known rejected sandbox input `PRO1234!!` and confirm the UI now shows a clean blocker message.
4. Confirm the note remains unsigned and the Notes list/detail workflow still works after the failed attempt.
5. Confirm the touched frontend and backend files remain free of new workspace diagnostics.

## Files Touched

- apps/api/src/routes/cprs/tiu-notes.ts
- apps/web/src/components/cprs/panels/NotesPanel.tsx
- docs/clinical/writeback-scope-matrix.md
- ops/summary.md
- ops/notion-update.json