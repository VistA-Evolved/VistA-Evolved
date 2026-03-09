# Phase 618 - CPRS Cover Sheet Load Stability Verify

## Verification Steps

1. Ensure VEHU and the API are running cleanly before browser verification.
2. Load `http://127.0.0.1:3000/cprs/chart/46/cover` in an authenticated browser session.
3. Confirm the Cover Sheet shows live problems, allergies, vitals, notes, and reminders instead of false pending state.
4. Confirm live-empty cards remain truthful for medications, labs, and immunizations when the API returns empty success.
5. Confirm Orders Summary remains explicit integration-pending because `ORWORB UNSIG ORDERS` is unavailable in this VistA lane.
6. Toggle cover-sheet customization and confirm save/reset calls no longer fail CORS preflight.
7. Run `pnpm -C apps/web exec tsc --noEmit`.

## Acceptance Criteria

- No false empty or false pending posture remains on the Cover Sheet when the backing API is healthy.
- Cover Sheet startup no longer self-inflicts rate-limit failures under normal chart entry.
- `/ui-prefs/coversheet` accepts authenticated `PUT` and `DELETE` requests from the web origin.
- Browser validation confirms truthful card content for DFN 46.
- The implementation stays aligned with Phases 601-606 instead of inventing new UI semantics.

## Files Touched

- prompts/618-PHASE-618-CPRS-COVERSHEET-LOAD-STABILITY/618-01-IMPLEMENT.md
- prompts/618-PHASE-618-CPRS-COVERSHEET-LOAD-STABILITY/618-99-VERIFY.md
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/stores/data-cache.tsx
- apps/api/src/server/register-plugins.ts
