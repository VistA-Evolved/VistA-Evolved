# Phase 726 - Full Truth And UX Audit - IMPLEMENT 04

## User Request
Continue the Phase 726 audit correctly by closing the next real unresolved P1 branch after inpatient and handoff, using live browser proof on the canonical VEHU chart shell instead of relying on route-only evidence.

## Implementation Steps
1. Reconfirm canonical Docker and API health before the chart-shell pass.
2. Inventory what the browser audit artifact still lacks for `/cprs/chart/:dfn/:tab` and `/chart/:dfn/:tab`.
3. Live-probe the canonical chart shell at `/cprs/chart/46/cover` against the current VEHU-backed data routes.
4. Compare the browser’s patient banner, tab shell, and core panels with the live baseline evidence for allergies, problems, meds, notes, vitals, labs, reminders, and appointments.
5. Confirm whether any chart controls are dead, misleading, or silently disconnected from the live route truth.
6. Fix only real chart-shell truth defects found during the browser pass; do not broaden scope into unrelated panels without evidence.
7. Re-run live browser proof after any fixes and corroborate with canonical API fetches from the authenticated session.
8. Update the browser audit artifact and ops records only after the chart shell is browser-proven truthfully.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-04-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-92-VERIFY.md
- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/components/cprs/**
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json