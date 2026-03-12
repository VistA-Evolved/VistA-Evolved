# Phase 726 - Full Truth And UX Audit - IMPLEMENT 03

## User Request
Continue the Phase 726 live truth-and-browser audit correctly, closing the next real unresolved P1 surface after workspace-terminal proof instead of certifying stale or silent UI states.

## Implementation Steps
1. Reconfirm which P1 surfaces remain unbrowser-proven after the workspace-terminal closeout.
2. Live-probe the inpatient and handoff branch on the canonical VEHU stack before editing.
3. Compare browser behavior with the canonical API responses for inpatient census, bedboard, and handoff ward-patient loading.
4. Confirm whether the handoff create flow is hiding truthful integration-pending metadata behind a silent zero-patient state.
5. Fix the handoff UI at the root cause so the browser surfaces pendingTargets or sandbox grounding when ward patient assembly is unavailable.
6. Preserve the existing truthful local-storage banner and do not fabricate ward-patient data.
7. Keep the ward entry and patient-loading workflow aligned with the live `/handoff/ward-patients` contract.
8. Re-test the changed handoff page on the canonical frontend and corroborate the route response on the canonical API.
9. Update only evidence-backed Phase 726 artifacts and ops records after the browser proof is complete.

## Files Touched
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-03-IMPLEMENT.md
- prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-91-VERIFY.md
- apps/web/src/app/cprs/handoff/page.tsx
- artifacts/phase726-p1-browser-control-audit.md
- ops/summary.md
- ops/notion-update.json