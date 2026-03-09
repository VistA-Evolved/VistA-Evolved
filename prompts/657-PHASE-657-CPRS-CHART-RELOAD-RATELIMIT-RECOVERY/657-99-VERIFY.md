# Phase 657 - CPRS Chart Reload Rate-Limit Recovery Verify

## Verification Steps

1. Open an authenticated Reports chart.
2. Reload the page and observe the session/bootstrap behavior.
3. Verify the chart remains on the intended CPRS route.
4. Verify the patient banner and report catalog still render after reload.

## Acceptance Criteria

- Chart reload no longer self-inflicts enough fan-out to force a login redirect.
- Session bootstrap tolerates transient non-401 failures during reload.
- Reports remains usable after reload from the clinician perspective.

## Files Touched

- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx
- apps/web/src/stores/session-context.tsx
