# Phase 657 - CPRS Chart Reload Rate-Limit Recovery

## User Request

- Continue the live CPRS chart audit until the user-facing workflow is stable.
- Fix real chart reload failures instead of accepting partial load or login redirect regressions.

## Implementation Steps

1. Reproduce the chart reload failure where the Reports chart reload triggers a burst of API calls, hits rate limiting, and then drops the clinician back to login.
2. Confirm which chart-level prefetch behavior is redundant with panel-level fetches.
3. Reduce chart fan-out so non-cover tabs only prefetch the active tab's clinical domain instead of all domains.
4. Harden the session bootstrap so transient `/auth/session` failures such as `429` do not immediately collapse into unauthenticated state.
5. Re-verify authenticated chart reload behavior in the browser on the Reports workflow.

## Verification Steps

1. Reload an authenticated `http://127.0.0.1:3000/cprs/chart/46/reports` tab.
2. Confirm the chart stays in-session instead of redirecting to login on transient load spikes.
3. Confirm the patient banner and Reports panel still load correctly after reload.
4. Confirm the browser console no longer floods with the same burst of `429 Too Many Requests` chart data calls.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/stores/session-context.tsx
