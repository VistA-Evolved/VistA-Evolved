# Phase 655 - CPRS Chart Session Redirect Recovery

## User Request

- Continue the live CPRS chart audit and fix the next real clinician-visible defect.
- Ensure the full UI works from the end-user perspective with truthful VistA-first behavior.

## Implementation Steps

1. Inspect the live CPRS chart and Reports tab behavior after the API restart.
2. Confirm whether the failure is a Reports RPC defect or an expired clinician session defect.
3. Patch the chart route so unauthenticated users are redirected to the CPRS login page instead of staying inside a broken chart shell.
4. Preserve the intended chart URL through the login flow so the user returns to the same patient/tab after re-authentication.
5. Verify the chart no longer spams protected API requests while unauthenticated.
6. Verify login returns to the original chart route and Reports can load again from an authenticated browser session.

## Verification Steps

1. Confirm the API is healthy and VistA is reachable.
2. Open the chart route in the browser with no active session and verify it redirects to `/cprs/login`.
3. Confirm the redirect query preserves the original chart path.
4. Log in through the CPRS login form and verify the browser returns to the original chart route.
5. Confirm the Reports tab no longer shows repeated `401 Unauthorized` fetch failures once re-authenticated.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/app/cprs/login/page.tsx
