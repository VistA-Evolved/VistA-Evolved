# Phase 712 - IMPLEMENT: CPRS Session Expiry Truth Recovery

## Implementation Steps

1. Reproduce the clinician-facing Orders defect where the chart shell remains mounted but a live Orders fetch degrades into `Source: http-401` and empty local-cache messaging.
2. Confirm the backend route itself is healthy with a fresh VEHU clinician login before changing frontend code.
3. Trace whether the web session provider can remain authenticated after the API session cookie has expired or been invalidated.
4. Add shared frontend session revalidation so focus, visibility return, and similar recovery points re-check `/auth/session` instead of trusting stale client state forever.
5. Add an explicit frontend session-expired recovery path for live panel 401s so Orders can invalidate stale client auth immediately.
6. Update the Orders panel posture so a 401 is surfaced as `session-expired` instead of a misleading empty-order cache explanation.
7. Preserve truthful `pending` handling for genuine VistA pending responses and preserve live `vista` rendering for healthy sessions.

## Files Touched

- apps/web/src/stores/session-context.tsx
- apps/web/src/components/cprs/panels/OrdersPanel.tsx
- docs/runbooks/auth-troubleshooting.md
- ops/summary.md
- ops/notion-update.json
