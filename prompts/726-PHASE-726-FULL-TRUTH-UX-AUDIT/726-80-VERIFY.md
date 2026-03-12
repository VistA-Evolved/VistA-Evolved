# Phase 726 - Full Truth And UX Audit - VERIFY 80

## Verification Steps

1. Confirm VEHU and platform database containers are healthy before testing.
2. Authenticate to the canonical API and capture a valid browser session.
3. Verify the PH HMO Console backing routes return truthful current-stack data for the current tenant.
4. Browser-prove `/cprs/admin/ph-hmo-console` against those live routes.
5. Exercise at least one safe interaction path that should visibly reflect route-backed state.
6. If a fix is required, re-run the browser proof after the patch.
7. Update the audit artifact and ops files with only the findings actually proven during this slice.

## Acceptance Criteria

1. The PH HMO Console reflects the real current registry, capability, packet, and validation route state on this stack rather than placeholder or stale copy.
2. Registry, packet, validation, empty-state, pending-state, and error-state messaging is truthful to the underlying responses.
3. Safe browser interactions remain aligned with the live PH HMO routes after refresh.
4. Evidence of the verified browser flow is recorded in the Phase 726 artifact bundle.

## Files Touched

- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-24-IMPLEMENT.md`
- `prompts/726-PHASE-726-FULL-TRUTH-UX-AUDIT/726-80-VERIFY.md`
- `apps/web/src/app/cprs/admin/ph-hmo-console/page.tsx`
- `apps/api/src/rcm/payers/**`
- `artifacts/phase726-p1-browser-control-audit.md`
- `ops/summary.md`
- `ops/notion-update.json`