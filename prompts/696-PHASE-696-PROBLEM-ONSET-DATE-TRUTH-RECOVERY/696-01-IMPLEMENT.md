# Phase 696 - Problem Onset Date Truth Recovery

## User Request
- Continue making clinician workflows truthful and production-grade.
- Fix user-facing defects proven live in the chart shell.
- Follow prompt lineage and repair root causes rather than papering over symptoms.

## Implementation Steps
1. Inventory the live Cover Sheet problem-onset rendering defect and confirm which routes supply the problem list data.
2. Fix the problem date normalization so partial FileMan dates do not render impossible values such as `1975-04-00`.
3. Apply the same normalization to the portal health problem route so clinician and portal surfaces stay consistent.
4. Keep partial-date truthfulness explicit by preserving month-only or year-only precision when day or month is unknown.
5. Verify the Cover Sheet and Problems view no longer surface impossible onset dates for DFN 46.

## Files Touched
- apps/api/src/server/inline-routes.ts
- apps/api/src/routes/portal-auth.ts
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes
- Live browser proof on /cprs/chart/46/cover and /cprs/chart/46/problems.
- Route proof from /vista/problems?dfn=46.
- Compile / diagnostics proof for changed files.
