# Phase 703 - CPRS Notes Selection Truth Recovery Verification

## Verification Steps

1. Confirm Docker and the API are running cleanly on the VEHU lane.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/notes?dfn=46` and capture the current live TIU notes payload.
4. Open `/cprs/chart/46/notes` in an authenticated browser session and select a note.
5. Refresh the notes list or change the patient context.
6. Confirm the detail pane, note text, sign dialog, and addendum context clear if the selected note is no longer present in the live TIU list.
7. Run editor diagnostics on `apps/web/src/components/cprs/panels/NotesPanel.tsx`.

## Acceptance Criteria

- The Notes detail pane cannot preserve stale selected-note state after patient changes or live list refreshes.
- Note text, sign, and addendum transient state are cleared when selection becomes invalid.
- Diagnostics are clean on the touched panel file.
