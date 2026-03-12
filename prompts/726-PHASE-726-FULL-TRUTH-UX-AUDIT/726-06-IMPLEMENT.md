# Phase 726 - Full Truth And UX Audit - IMPLEMENT 06

## User Request
Continue the Phase 726 audit correctly by closing the remaining legacy P1 alias surfaces with live browser proof, specifically the non-CPRS patient search and legacy chart shell routes, instead of assuming the CPRS route proof automatically covers them.

## Implementation Steps
1. Reconfirm canonical Docker and API health before touching the legacy alias routes.
2. Inspect the current alias implementations for `/patient-search` and `/chart/:dfn/:tab` to determine whether they are truthful aliases, stale parallel shells, or broken divergences.
3. Browser-prove `/patient-search` on the canonical VEHU stack and compare its search, selection, and chart-open behavior against the live patient-search routes.
4. Browser-prove `/chart/46/cover` and at least one additional legacy chart tab, comparing patient context and live panel behavior against the canonical VEHU routes.
5. Fix only real alias-route defects found during the pass, with preference for converging on truthful shared behavior rather than maintaining misleading duplicate shells.
6. Re-run browser proof plus authenticated API corroboration after any fix.
7. Update the Phase 726 browser audit artifact, runtime audit overrides, and ops records only after the legacy alias surfaces are evidence-backed.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-06-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-94-VERIFY.md
- apps/web/src/app/patient-search/page.tsx
- apps/web/src/app/chart/[dfn]/[tab]/page.tsx
- artifacts/phase726-p1-browser-control-audit.md
- data/ui-estate/runtime-ui-audit-overrides.json
- data/ui-estate/runtime-ui-audit-checklist.json
- docs/ui-estate/runtime-ui-audit-checklist.md
- data/ui-estate/runtime-ui-truth-matrix.json
- docs/ui-estate/runtime-ui-truth-matrix.md
- ops/summary.md
- ops/notion-update.json