# Phase 726-59 Verify - Admin Reports Slice

## Verification Goal

Prove `/cprs/admin/reports` against the live canonical API, confirm authenticated and unauthenticated behavior for every browser-visible surface exercised in the slice, and record only browser-backed truth.

## Verification Steps

1. Verify Docker, API, and VistA are reachable on the canonical VEHU stack.
2. Authenticate with `PRO1234 / PRO1234!!` and capture the live outputs for the `/reports/*` routes the page calls in the audited slice.
3. Capture the same routes unauthenticated and confirm the real auth failure contract.
4. Browser-prove `/cprs/admin/reports` in the authenticated session across each tab or workflow exercised in the slice.
5. Browser-prove the same route unauthenticated and confirm the page does not fail open into fake loading, fake empty, or stale success states.
6. If code changes were required, re-run the authenticated and unauthenticated browser proof after the fix.
7. Record the slice in the browser audit artifact, runtime overrides, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` and confirm the checklist advances.

## Acceptance Criteria

1. Every browser-visible reports surface exercised in the slice is corroborated against its live route contract.
2. Any unauthenticated reports load fails closed with truthful auth/load messaging.
3. Any code change is minimal, evidence-backed, and re-proven in the browser.
4. The Phase 726 audit artifact and runtime checklist reflect the completed slice.# Phase 726-59 Verify - Module Validation Slice

## Verification Goal

Prove `/cprs/admin/module-validation` against the live canonical API, confirm authenticated and unauthenticated behavior for every tab, and record only browser-backed truth.

## Verification Steps

1. Verify Docker, API, and VistA are reachable on the canonical VEHU stack.
2. Authenticate with `PRO1234 / PRO1234!!` and capture the live outputs for:
   - `GET /admin/module-validation/report`
   - `GET /admin/module-validation/dependencies`
   - `GET /admin/module-validation/boundaries`
   - `GET /admin/module-validation/coverage`
3. Capture the same endpoints unauthenticated and confirm the real auth failure contract.
4. Browser-prove `/cprs/admin/module-validation` in the authenticated session across every tab.
5. Browser-prove the same route unauthenticated and confirm the page does not fail open into fake loading or empty success states.
6. If code changes were required, re-run the authenticated and unauthenticated browser proof after the fix.
7. Record the slice in the browser audit artifact, runtime overrides, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` and confirm the checklist advances.

## Evidence

- Live API responses for authenticated and unauthenticated route calls
- Browser snapshots of authenticated and unauthenticated module-validation states
- Regenerated runtime audit checklist and truth matrix