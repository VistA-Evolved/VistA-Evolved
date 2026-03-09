# Phase 716 - CPRS Verify Dashboard Truth Recovery

## User request
- Continue the live CPRS audit until built UI surfaces are genuinely working for the user rather than failing because of stale AI-coded assumptions.

## Defect being recovered
- Live browser proof showed `/cprs/verify` reporting `6/21 passed, 15 failed` with repeated `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` failures.
- Root causes found in `apps/web/src/app/cprs/verify/page.tsx`:
  - the page fetches `/health` and `/vista/*` from the web origin instead of the API origin, so it parses HTML error pages as JSON;
  - multiple checks still use VEHU-invalid DFN `1`;
  - the dashboard does not gate on authenticated CPRS session state before running protected checks.

## Inventory first
- Files inspected:
  - `apps/web/src/app/cprs/verify/page.tsx`
  - `docs/runbooks/cprs-web-replica-v1.md`
- Live proof gathered:
  - `/cprs/verify` rendered 15 false failures in-browser due to HTML responses.
  - Live API proof confirmed `GET /vista/patient-search?q=ZZZRETFOURNINETYFOUR` returns DFN 46 on the VEHU lane.
- Files to change:
  - `apps/web/src/app/cprs/verify/page.tsx`
  - `docs/runbooks/cprs-web-replica-v1.md`
  - `ops/summary.md`
  - `ops/notion-update.json`

## Implementation steps
1. Route protected verify API checks through `API_BASE` instead of the web origin.
2. Replace stale DFN `1` probes with VEHU-valid DFN `46` and a known-good search term.
3. Gate the verify page on session readiness/authentication and redirect unauthenticated users to `/cprs/login?redirect=/cprs/verify`.
4. Update the runbook so the verification dashboard is documented against the VEHU lane rather than stale WorldVistA assumptions.

## Verification steps
1. Open `/cprs/verify` in a fresh unauthenticated browser session and confirm it redirects to `/cprs/login?redirect=%2Fcprs%2Fverify`.
2. Sign in with `PRO1234 / PRO1234!!`.
3. Confirm `/cprs/verify` runs checks against the API origin and no longer reports HTML parse failures.
4. Confirm patient-bound checks use DFN 46 / `ZZZRETFOURNINETYFOUR` and return meaningful results on the VEHU lane.

## Files touched
- `prompts/716-PHASE-716-CPRS-VERIFY-DASHBOARD-TRUTH-RECOVERY/716-01-IMPLEMENT.md`
- `prompts/716-PHASE-716-CPRS-VERIFY-DASHBOARD-TRUTH-RECOVERY/716-99-VERIFY.md`
- `apps/web/src/app/cprs/verify/page.tsx`
- `docs/runbooks/cprs-web-replica-v1.md`
- `ops/summary.md`
- `ops/notion-update.json`