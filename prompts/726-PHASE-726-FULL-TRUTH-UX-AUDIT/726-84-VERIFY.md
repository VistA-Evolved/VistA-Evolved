# Phase 726 - Full Truth And UX Audit - VERIFY 84

## Verification Steps

1. Confirm VEHU and platform database containers are healthy before testing.
2. Authenticate to the canonical API and capture a valid browser session.
3. Verify the claims-workbench backing `/rcm/claims/hmo*` routes return truthful board and claim workflow data for the current stack.
4. Browser-prove `/cprs/admin/claims-workbench` against those live routes.
5. Exercise at least one safe interaction path that should visibly reflect route-backed state.
6. If a fix is required, re-run the browser proof after the patch.
7. Update the audit artifact and ops files with only the findings actually proven during this slice.

## Acceptance Criteria

1. The claims-workbench page reflects the real live HMO claims workflow state on this stack rather than placeholder or stale copy.
2. Any empty-state, pending-state, or error-state copy is truthful to the underlying `/rcm/claims/hmo*` responses.
3. Safe browser interactions remain aligned with the underlying workflow routes after refresh.
4. Evidence of the verified browser flow is recorded in the Phase 726 artifact bundle.

## Files Touched

- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-20-IMPLEMENT.md`
- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-84-VERIFY.md`
- `apps/web/src/app/cprs/admin/claims-workbench/page.tsx`
- `apps/api/src/rcm/workflows/claims-workflow-routes.ts`
- `artifacts/phase726-p1-browser-control-audit.md`
- `ops/summary.md`
- `ops/notion-update.json`
