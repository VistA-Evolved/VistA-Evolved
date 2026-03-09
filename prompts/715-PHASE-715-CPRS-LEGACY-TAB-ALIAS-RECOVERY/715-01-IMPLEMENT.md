# Phase 715 - CPRS Legacy Tab Alias Recovery

## User request
- Continue the live clinician-facing CPRS audit until the UI is genuinely working end to end from the browser, frontend, backend, VistA, and system perspective.
- Use live browser/runtime proof first and recover real clinician defects rather than speculative code cleanup.

## Defect being recovered
- After recovering `cover-sheet` in Phase 714, additional legacy chart tab slugs were proven to fail in the live browser.
- Opening the following redirect URLs and signing in with `PRO1234 / PRO1234!!` lands on `NEXT_HTTP_ERROR_FALLBACK;404` instead of the intended chart tab:
  - `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fdc-summaries`
  - `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fai-assist`
  - `/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Ftele-health`
- The chart route only accepts canonical tab slugs such as `dcsumm`, `aiassist`, and `telehealth`, so legacy label-derived slugs still strand clinicians on a chart error page after successful authentication.

## Inventory first
- Files inspected:
  - `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
  - `apps/web/src/lib/chart-types.ts`
  - `apps/web/src/components/cprs/CPRSTabStrip.tsx`
  - `docs/runbooks/cprs-parity-closure-phase14.md`
- Existing UI behavior involved:
  - `/cprs/login` redirect flow
  - `/cprs/chart/[dfn]/[tab]` chart shell route validation
  - canonical tab slugs `dcsumm`, `aiassist`, `telehealth`
- Files to change:
  - `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
  - `docs/runbooks/cprs-parity-closure-phase14.md`
  - `ops/summary.md`
  - `ops/notion-update.json`

## Implementation steps
1. Extend chart-tab alias normalization so proven legacy slugs map to their canonical chart tabs before validation.
2. Ensure authenticated and unauthenticated redirect flows rewrite those legacy slugs onto the canonical tab URLs.
3. Preserve existing module gating, tab highlighting, panel rendering, and ActionInspector wiring against canonical slugs only.
4. Update the CPRS parity runbook so the legacy alias recovery contract includes D/C Summary, AI Assist, and Telehealth slugs.

## Verification steps
1. Open each of the following in a fresh browser session and sign in with `PRO1234 / PRO1234!!`:
   - `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fdc-summaries`
   - `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fai-assist`
   - `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Ftele-health`
2. Confirm they land on `/cprs/chart/46/dcsumm`, `/cprs/chart/46/aiassist`, and `/cprs/chart/46/telehealth` respectively.
3. Confirm each canonical chart tab renders normal content instead of `NEXT_HTTP_ERROR_FALLBACK;404`.

## Files touched
- `prompts/715-PHASE-715-CPRS-LEGACY-TAB-ALIAS-RECOVERY/715-01-IMPLEMENT.md`
- `prompts/715-PHASE-715-CPRS-LEGACY-TAB-ALIAS-RECOVERY/715-99-VERIFY.md`
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`