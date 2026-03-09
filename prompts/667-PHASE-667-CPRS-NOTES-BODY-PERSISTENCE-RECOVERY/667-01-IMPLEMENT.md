# Phase 667 - CPRS Notes Body Persistence Recovery

## Objective

Recover the live CPRS Notes create workflow so a clinician-entered note body is actually persisted in VistA TIU and readable through the standard note detail flow.

## Implementation Steps

1. Inventory the existing Notes workflow touchpoints before editing:
- `apps/web/src/components/cprs/panels/NotesPanel.tsx`
- `apps/api/src/routes/cprs/wave2-routes.ts`
- `apps/api/src/routes/cprs/tiu-notes.ts`
- `docs/runbooks/vista-rpc-notes.md`

2. Confirm the defect against live VEHU:
- Create a note for DFN 46 from the CPRS Notes panel.
- Verify the list refreshes with a new TIU IEN.
- Read the created note through `GET /vista/cprs/notes/text?ien=<newIen>`.
- Treat header-only TIU output as a failure because the clinician body text was lost.

3. Correct the clinician-facing success contract in the Notes create and addendum routes.
- Probe the live TIU write behavior in VEHU instead of assuming `TIU SET DOCUMENT TEXT` success means body persistence.
- Only return `ok:true` when TIU readback proves the note body was persisted.
- If VEHU creates only a shell note or addendum, block success explicitly so the UI stays truthful.

4. Update the Notes runbook so body readback is part of the truthfulness contract for create/addendum.

## Files Touched

- `apps/api/src/routes/cprs/wave2-routes.ts`
- `apps/api/src/routes/cprs/tiu-notes.ts`
- `docs/runbooks/vista-rpc-notes.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/667-PHASE-667-CPRS-NOTES-BODY-PERSISTENCE-RECOVERY/667-01-IMPLEMENT.md`
- `prompts/667-PHASE-667-CPRS-NOTES-BODY-PERSISTENCE-RECOVERY/667-99-VERIFY.md`