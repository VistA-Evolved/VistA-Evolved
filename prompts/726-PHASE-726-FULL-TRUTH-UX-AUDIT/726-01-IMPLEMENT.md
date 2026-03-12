# Phase 726 - Full Truth And UX Audit - IMPLEMENT

## User Request
Double-check the existing VistA UI master plans, verify implementation claims against the repo and live VistA behavior, and start a full end-to-end UI and UX audit so that no page, button, feature, or workflow is left unchecked.

## Implementation Steps
1. Verify the truth environment first: required Docker containers, API dependencies, and the current VistA lanes must be healthy before any audit claims are accepted.
2. Inventory the plan claims in the four .cursor plan files and classify them as verified, partial, unverified, or contradicted.
3. Inventory the current user-facing estate across web, portal, marketing, desktop, and mobile using filesystem routes and canonical registries.
4. Build a machine-readable runtime UI estate artifact that records page counts, route counts, panel breadth, action-registry breadth, test coverage breadth, and current certification signals.
5. Cross-check generated breadth against certified breadth so generated package surfaces are not mistaken for completed functionality.
6. Audit documentation provenance inputs for the currently active packages and flows.
7. Define the UI/UX audit boundary so every page, button, tab, modal, menu item, form, and workflow is included.
8. Seed a first-pass truth matrix from current repo evidence so the review begins with explicit signals instead of narrative plan claims.
9. Add a repeatable live-baseline verifier for the core P1 chart surfaces that writes evidence to `artifacts/`.
10. Add a second repeatable live verifier for unresolved P1 surfaces so inbox, messaging, nursing, handoff, inpatient, and admin VistA pages are classified with route-level evidence.
11. Extend the audit tooling and runbooks so the estate audit can be repeated and expanded without inventing new ad hoc formats.
12. Keep VEHU as the current truth lane until vista-distro proves parity on representative live route checks.
13. Record evidence-driven findings only; do not copy completion claims from old plans without proof.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-01-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-99-VERIFY.md
- scripts/ui-estate/build-runtime-ui-estate.mjs
- scripts/ui-estate/build-runtime-ui-truth-matrix.mjs
- scripts/ui-estate/verify-runtime-ui-live-baseline.mjs
- scripts/ui-estate/verify-runtime-ui-live-p1-followup.mjs
- docs/runbooks/phase726-full-truth-ux-audit.md
- data/ui-estate/runtime-ui-estate.json
- docs/ui-estate/runtime-ui-estate.md
- data/ui-estate/runtime-ui-audit-checklist.json
- docs/ui-estate/runtime-ui-audit-checklist.md
- data/ui-estate/runtime-ui-truth-matrix.json
- docs/ui-estate/runtime-ui-truth-matrix.md
- artifacts/phase726-p1-live-baseline.json
- artifacts/phase726-p1-live-baseline.md
- artifacts/phase726-p1-browser-control-audit.md
- apps/web/src/app/cprs/messages/page.tsx
- services/vista/ZVEMSGR.m
- ops/summary.md
- ops/notion-update.json
- package.json
