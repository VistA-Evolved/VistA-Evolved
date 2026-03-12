# Phase 726 - Full Truth And UX Audit - VERIFY

## Verification Steps
1. Confirm the required Docker containers are running and healthy, including VEHU, platform PG, and the current distro lane if present.
2. Run the runtime UI estate inventory builder and verify that it produces JSON and Markdown outputs for the inventory and checklist.
3. Run the runtime truth-matrix builder and verify that it produces JSON and Markdown outputs.
4. Run the runtime live-baseline verifier and verify that it writes JSON and Markdown evidence to `artifacts/`.
5. Run the unresolved-P1 follow-up verifier and verify that it writes JSON and Markdown evidence to `artifacts/`.
6. Confirm the inventory includes all user-facing app families: web, portal, marketing, desktop, and mobile.
7. Confirm the inventory includes cross-check data for VistA panel breadth, docs breadth, action-registry breadth, E2E test breadth, and package certification breadth.
8. Confirm the truth matrix includes first-pass truth buckets, priority levels, and evidence hints for packages, route tests, actions, panels, and E2E specs.
9. Confirm the live baselines capture authenticated VEHU evidence for both the core chart read stack and the unresolved P1 surfaces with truthful empty/pending/local-store classifications.
10. Verify the new runbook documents how to regenerate the inventory, truth matrix, and both live baselines and how to use them as the audit boundary.
11. Validate that the new prompt pack satisfies prompt ordering rules and includes implementation and verification sections.
12. Confirm no unrelated files were changed and that the new artifacts are focused on truth/audit infrastructure.

## Acceptance Criteria
1. Committed, reproducible runtime UI estate inventory and truth-matrix artifacts exist.
2. The inventory is broad enough to serve as the outer boundary for the full UI/UX audit.
3. The truth matrix gives every current surface an initial evidence-seeded posture before manual review.
4. A repeatable live-baseline verifier exists and writes current evidence to `artifacts/`.
5. A repeatable unresolved-P1 verifier exists and writes current evidence to `artifacts/`.
6. The runbook explains how the estate inventory, truth matrix, and live baselines connect to the larger truth-and-verification plan.
7. The prompt pack captures the user request, implementation steps, verification steps, and touched files clearly.
8. The phase produces evidence infrastructure, not just new prose.

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
