# Phase 716 - CPRS Verify Dashboard Truth Recovery - Verify

## Browser proof
1. Open `/cprs/verify` in a fresh browser session.
2. Confirm unauthenticated access redirects to `/cprs/login?redirect=%2Fcprs%2Fverify`.
3. Sign in with `PRO1234 / PRO1234!!`.
4. Confirm the dashboard no longer shows HTML parse failures such as `Unexpected token '<'` for API checks.
5. Confirm the protected checks run against the API origin and show meaningful results for VEHU DFN 46.

## Contract proof
1. Confirm verify API checks route through `API_BASE` rather than the web origin.
2. Confirm patient-bound checks use VEHU-valid DFN 46 and the known-good search term `ZZZRETFOURNINETYFOUR`.
3. Confirm the page waits for session readiness and redirects unauthenticated users before running protected checks.