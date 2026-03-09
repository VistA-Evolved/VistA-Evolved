# Phase 655 - CPRS Chart Session Redirect Recovery Verify

## Verification Steps

1. Run the API with the live VEHU lane available.
2. Load `http://127.0.0.1:3000/cprs/chart/46/reports` in a browser with no active session.
3. Verify the user is redirected to `/cprs/login?redirect=...` rather than seeing a broken chart shell.
4. Authenticate with valid clinician credentials.
5. Verify the browser returns to the original chart route.
6. Verify the Reports panel loads from an authenticated session instead of failing with `401 Unauthorized`.

## Acceptance Criteria

- Unauthenticated access to CPRS chart routes no longer renders the chart shell.
- The login page preserves and honors a safe in-app redirect target.
- The browser returns to the intended chart route after successful login.
- The user-facing failure mode is a proper re-auth flow, not a partially loaded chart with repeated unauthorized fetches.
- The recovery is verified against the live browser and API.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/app/cprs/login/page.tsx
