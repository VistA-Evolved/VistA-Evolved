# Phase 714 - CPRS Cover Slug Alias Recovery

## User request
- Continue the live clinician-facing CPRS audit until the UI is genuinely working end to end from the user, frontend, backend, VistA, database, and system perspective.
- Use VistA first, prove defects from the real browser/runtime, and check prompt history before changing behavior.

## Defect being recovered
- Live browser proof showed that opening `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet` authenticated successfully but then landed on the chart error screen with `NEXT_HTTP_ERROR_FALLBACK;404`.
- The CPRS chart route only accepts the canonical tab slug `cover`, so a natural legacy slug such as `cover-sheet` is treated as an invalid tab instead of being normalized to the Cover Sheet route.

## Inventory first
- Files inspected:
  - `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
  - `apps/web/e2e/helpers/journey-config.ts`
  - `docs/runbooks/cprs-parity-closure-phase14.md`
- Existing UI behavior involved:
  - `/cprs/login` redirect flow
  - `/cprs/chart/[dfn]/[tab]` chart shell route validation
  - Cover Sheet canonical tab slug `cover`
- Files to change:
  - `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
  - `docs/runbooks/cprs-parity-closure-phase14.md`
  - `ops/summary.md`
  - `ops/notion-update.json`

## Implementation steps
1. Add a chart-tab alias normalization step so legacy slug `cover-sheet` maps to canonical `cover` before route validation.
2. Ensure authenticated and unauthenticated redirect flows use the canonical slug so the browser lands on `/cprs/chart/46/cover` instead of staying on the broken alias.
3. Keep existing module gating, tab strip highlighting, ActionInspector wiring, and panel rendering bound to the canonical slug.
4. Document the truth contract for legacy Cover Sheet slug recovery in the CPRS parity runbook.

## Verification steps
1. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet` in a fresh browser session.
2. Sign in with `PRO1234 / PRO1234!!`.
3. Confirm the app lands on `/cprs/chart/46/cover` instead of a 404 error view.
4. Confirm the live Cover Sheet renders patient data and the Appointments section still shows the truthful `ORWPT APPTLST` empty-state for DFN 46.

## Files touched
- `prompts/714-PHASE-714-CPRS-COVER-SLUG-ALIAS-RECOVERY/714-01-IMPLEMENT.md`
- `prompts/714-PHASE-714-CPRS-COVER-SLUG-ALIAS-RECOVERY/714-99-VERIFY.md`
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`