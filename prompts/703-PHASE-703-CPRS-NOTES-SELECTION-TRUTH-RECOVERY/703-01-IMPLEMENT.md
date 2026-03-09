# Phase 703 - CPRS Notes Selection Truth Recovery

## Goal

Recover truthful Notes panel selection behavior so `/cprs/chart/:dfn/notes` cannot preserve stale note detail, sign, or addendum context after live list refreshes or patient changes.

## Implementation Steps

1. Inspect the Notes panel state flow in `apps/web/src/components/cprs/panels/NotesPanel.tsx`.
2. Confirm the panel fetches live notes from `/vista/notes` and note text from the TIU text route.
3. Add reconciliation so the selected note is cleared when it is no longer present in the latest live notes list.
4. Clear stale note text, sign-dialog state, addendum state, and related transient note actions when selection becomes invalid.
5. Preserve the current note selection only when the selected note still exists in the refreshed live list.
6. Update the CPRS parity runbook and ops artifacts with the corrected selection contract.

## Files Touched

- `apps/web/src/components/cprs/panels/NotesPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
