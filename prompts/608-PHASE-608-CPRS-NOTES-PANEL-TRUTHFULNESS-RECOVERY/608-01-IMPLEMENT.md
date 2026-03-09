# Phase 608 - IMPLEMENT: CPRS Notes Panel Truthfulness Recovery

## User Request

- Continue autonomously, VistA-first, and repair real end-user workflow gaps instead of leaving partially wired UI states.
- Check prompt lineage before changing stale areas.
- Keep the frontend, backend, and live VEHU behavior truthful for the user.

## Scope

- Recover the standalone CPRS Notes panel so it does not collapse failed or integration-pending note reads into a fake `No notes on record` empty state.
- Reuse the per-domain cache metadata introduced in Phase 606 instead of inventing a parallel notes-specific state model.
- Preserve existing note list, detail, create, sign, and addendum behavior.

## Implementation Steps

1. Review the original note-list prompt lineage from Phase 7A and the TIU parity contract from Phase 60.
2. Wire `apps/web/src/components/cprs/panels/NotesPanel.tsx` to `useDataCache().getDomainMeta(dfn, 'notes')`.
3. When the latest notes fetch is failed or integration-pending and there are no trustworthy rows, render a grounded pending banner with status, attempted RPCs, and target RPCs instead of `No notes on record`.
4. Improve `apps/web/src/stores/data-cache.tsx` so request-failure metadata preserves per-domain fallback targets; otherwise the Notes panel cannot explain what VistA dependency is pending when the request itself fails.
5. Update the notes runbook so the documented Notes panel behavior matches the recovered truthfulness contract.

## Files Touched

- apps/web/src/components/cprs/panels/NotesPanel.tsx
- apps/web/src/stores/data-cache.tsx
- docs/runbooks/vista-rpc-notes.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes

- Verify Docker and API health before validation.
- Confirm the Notes panel still compiles after the UI change.
- Exercise live notes list and note-text routes against VEHU for DFN 46.
- Verify repo gates remain green after prompt metadata regeneration if a new prompt folder is added.