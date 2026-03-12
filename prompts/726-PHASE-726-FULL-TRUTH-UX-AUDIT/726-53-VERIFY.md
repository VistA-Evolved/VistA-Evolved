# Phase 726-53 Verify - Admin Service Lines Slice

## Verification Goal

Prove `/cprs/admin/service-lines` against the live canonical API, confirm authenticated and unauthenticated behavior for every browser-visible surface exercised in the slice, and record only browser-backed truth.

## Verification Steps

1. Verify Docker, API, and VistA are reachable on the canonical VEHU stack.
2. Authenticate with `PRO1234 / PRO1234!!` and capture the live outputs for `/ed/board`, `/or/board`, and `/icu/metrics`.
3. Capture the same endpoints unauthenticated and confirm the real auth failure or public-access contract.
4. Browser-prove `/cprs/admin/service-lines` in the authenticated session across the ED, OR, and ICU tabs.
5. Browser-prove the same route unauthenticated and confirm the page does not fail open into fake loading, fake empty, or stale success states.
6. If code changes were required, re-run the authenticated and unauthenticated browser proof after the fix.
7. Record the slice in the browser audit artifact, runtime overrides, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` and confirm the checklist advances.

## Acceptance Criteria

1. Every browser-visible service-lines surface exercised in the slice is corroborated against its live route contract.
2. Any unauthenticated service-lines load fails closed with truthful auth/load messaging if the routes are session-protected.
3. Any code change is minimal, evidence-backed, and re-proven in the browser.
4. The Phase 726 audit artifact and runtime checklist reflect the completed slice.
