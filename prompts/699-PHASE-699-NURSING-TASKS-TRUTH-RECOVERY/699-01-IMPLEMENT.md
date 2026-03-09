# Phase 699 - Nursing Tasks Truth Recovery

## Goal

Recover truthful standalone nursing task behavior on `/cprs/nursing` so the user-facing task table reflects the live VistA task feed instead of fabricated local checklist rows.

## Implementation Steps

1. Inspect the standalone nursing workspace task rendering in `apps/web/src/app/cprs/nursing/page.tsx`.
2. Preserve the existing live `/vista/nursing/tasks` route as the governing data source for patient-specific task rows.
3. Replace locally fabricated patient task rows with the live task payload from `/vista/nursing/tasks?dfn=N`.
4. Keep shift safety reminders only if they are clearly labeled as local checklist guidance rather than live patient task rows.
5. Add partial-load truth handling so a failed task or flowsheet fetch does not silently render a misleading healthy or empty state.
6. Update the nursing workflow runbook with the corrected live task contract and verification guidance.

## Files Touched

- `apps/web/src/app/cprs/nursing/page.tsx`
- `docs/runbooks/nursing-flowsheets.md`
- `ops/summary.md`
- `ops/notion-update.json`
