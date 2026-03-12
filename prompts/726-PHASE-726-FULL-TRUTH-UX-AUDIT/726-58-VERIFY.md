# Phase 726-58 Verify - Admin Reconciliation Slice

## Verification Goal

Prove `/cprs/admin/reconciliation` against the live canonical API, confirm authenticated and unauthenticated behavior for every browser-visible surface exercised in the slice, and record only browser-backed truth.

## Verification Steps

1. Verify Docker, API, and VistA are reachable on the canonical VEHU stack.
2. Authenticate with `PRO1234 / PRO1234!!` and capture the live outputs for the reconciliation routes the page calls in the audited slice.
3. Capture the same routes unauthenticated and confirm the real auth failure contract.
4. Browser-prove `/cprs/admin/reconciliation` in the authenticated session across each tab or workflow exercised in the slice.
5. Browser-prove the same route unauthenticated and confirm the page does not fail open into fake loading, fake empty, or stale success states.
6. If code changes were required, re-run the authenticated and unauthenticated browser proof after the fix.
7. Record the slice in the browser audit artifact, runtime overrides, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` and confirm the checklist advances.

## Acceptance Criteria

1. Every browser-visible reconciliation surface exercised in the slice is corroborated against its live route contract.
2. Any unauthenticated reconciliation load fails closed with truthful auth/load messaging.
3. Any code change is minimal, evidence-backed, and re-proven in the browser.
4. The Phase 726 audit artifact and runtime checklist reflect the completed slice.# Phase 726-58 Verify - Onboarding Slice

## Verification Goal

Prove `/cprs/admin/onboarding` against the live canonical API, confirm authenticated and unauthenticated behavior for every browser-visible surface, and record only browser-backed truth.

## Verification Steps

1. Verify Docker, API, and VistA are reachable on the canonical VEHU stack.
2. Authenticate with `PRO1234 / PRO1234!!` and capture the live outputs for every onboarding route the page calls.
3. Capture the same routes unauthenticated and confirm the real auth failure contract.
4. Browser-prove `/cprs/admin/onboarding` in the authenticated session across each tab or workflow the page exposes.
5. Browser-prove the same route unauthenticated and confirm the page does not fail open into fake loading or empty success states.
6. If code changes were required, re-run the authenticated and unauthenticated browser proof after the fix.
7. Record the slice in the browser audit artifact, runtime overrides, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` and confirm the checklist advances.