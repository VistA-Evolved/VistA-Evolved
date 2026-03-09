# Phase 713 - IMPLEMENT: CPRS ADT Census Truth Recovery

## User Request
- Continue the live CPRS audit and fix real user-facing truth defects instead of masking them.
- Keep the chart VistA-first, production-grade, and aligned with existing phase intent.

## Implementation Steps

1. Reproduce the ADT chart posture where the Ward Census Summary shows live ward counts but still displays an integration-pending banner.
2. Confirm the live `/vista/adt/census` response is already returning real ward summaries from `ORQPT WARDS` and `ORQPT WARD PATIENTS`.
3. Inspect the existing ADT prompts and route contract so the recovery reuses the intended Phase 615 and Phase 645 behavior.
4. Remove the misleading pending marker from the no-ward census summary contract while preserving truthful pending posture for genuinely partial ADT features such as movement history.
5. Update the relevant ADT runbook so clinicians and operators are not told the summary is pending when it is already live.
6. Re-verify the CPRS ADT chart tab in the browser and confirm the summary still loads real ward counts without the misleading banner.

## Files Touched

- apps/api/src/routes/adt/index.ts
- docs/runbooks/inpatient-adt.md
- ops/summary.md
- ops/notion-update.json
