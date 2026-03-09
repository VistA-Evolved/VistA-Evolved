# Phase 618 - CPRS Cover Sheet Load Stability

## User Request

- Continue autonomous VistA-first recovery work.
- Make the full CPRS UI truthful from the real browser end-user perspective.
- Check prompt lineage before changing stale, pending, or incomplete behavior.

## Problem Statement

The CPRS Cover Sheet still degrades into false pending posture even when the live API is healthy. Browser validation showed the page issuing enough concurrent requests to trip the general rate limiter, leaving cache-backed cards stuck in request-failed metadata. The same validation also exposed that cover-sheet layout save/reset calls are blocked by CORS because `PUT` and `DELETE` are not allowed in preflight responses.

## Implementation Steps

1. Reconfirm existing Cover Sheet recovery phases 601-606 and preserve their truthful empty/pending semantics.
2. Reduce burstiness of shared cache loading so cover-sheet startup does not self-inflict 429 responses.
3. Make Cover Sheet custom loaders run in a calmer sequence and retry transient pending/request-failed states in a bounded way.
4. Keep the panel truthful: show real data, live-empty, or explicit pending/error posture only.
5. Fix API CORS plugin configuration so `PUT` and `DELETE` are allowed for authenticated UI preference routes.
6. Revalidate the Cover Sheet in the browser against live VEHU-backed routes for DFN 46.

## Verification Steps

1. Run targeted web type checking.
2. Verify live browser Cover Sheet cards for DFN 46 after the load-stability patch.
3. Verify `PUT` and `DELETE` preflight for `/ui-prefs/coversheet` no longer fails in the browser.
4. Confirm live endpoints for allergies, vitals, notes, reminders, appointments, and orders summary still return truthful data.
5. Update ops artifacts with the recovery result.

## Files Touched

- prompts/618-PHASE-618-CPRS-COVERSHEET-LOAD-STABILITY/618-01-IMPLEMENT.md
- prompts/618-PHASE-618-CPRS-COVERSHEET-LOAD-STABILITY/618-99-VERIFY.md
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/stores/data-cache.tsx
- apps/api/src/server/register-plugins.ts
