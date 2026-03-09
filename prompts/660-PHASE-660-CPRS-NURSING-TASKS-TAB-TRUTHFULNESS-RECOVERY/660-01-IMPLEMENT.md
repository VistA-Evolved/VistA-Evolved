# Phase 660 - CPRS Nursing Tasks Tab Truthfulness Recovery

## User Request

Continue closing real clinician workflow gaps so the CPRS chart behaves truthfully, end to end, against live VistA where available.

## Implementation Steps

1. Inventory the Nursing chart Tasks sub-tab, the live `/vista/nursing/tasks` route, and the latest nursing prompt history before editing.
2. Verify whether the backend already returns truthful ORWPS-derived task rows or live empty state for DFN 46.
3. Fix the Nursing Tasks sub-tab so it renders returned task rows when present, shows a truthful live empty state when no tasks exist, and only shows pending messaging when the backend actually reports pending targets.
4. Preserve VistA-first semantics and avoid fake BCMA/PSB completion claims.
5. Re-verify the panel in the browser and, if needed, the route directly against the live API.

## Files Touched

- prompts/660-PHASE-660-CPRS-NURSING-TASKS-TAB-TRUTHFULNESS-RECOVERY/660-01-IMPLEMENT.md
- prompts/660-PHASE-660-CPRS-NURSING-TASKS-TAB-TRUTHFULNESS-RECOVERY/660-99-VERIFY.md
- apps/web/src/components/cprs/panels/NursingPanel.tsx
- ops/summary.md
- ops/notion-update.json
