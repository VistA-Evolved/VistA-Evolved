# Phase 714 - CPRS Cover Slug Alias Recovery - Verify

## Preconditions
- VEHU and platform DB containers are running.
- API is reachable.
- Web app is reachable on `http://127.0.0.1:3000`.

## Browser proof
1. Open `http://127.0.0.1:3000/cprs/login?redirect=%2Fcprs%2Fchart%2F46%2Fcover-sheet`.
2. Confirm the development login form contains `PRO1234 / PRO1234!!`.
3. Click `Sign On`.
4. Confirm the browser lands on `/cprs/chart/46/cover`.
5. Confirm the Cover Sheet renders live patient content instead of `NEXT_HTTP_ERROR_FALLBACK;404`.
6. Confirm the Appointments card remains truthful and shows `No upcoming appointments` for DFN 46.

## Contract proof
1. Confirm the chart route now normalizes `cover-sheet` to `cover` before validation.
2. Confirm module gating, panel rendering, and ActionInspector all use the canonical tab slug.
3. Confirm invalid non-aliased slugs still fall through to the existing `notFound()` behavior.

## Regression checks
1. Open `/cprs/chart/46/cover` directly and confirm it still renders normally.
2. Navigate from Cover Sheet to another tab and back; confirm the tab strip still highlights `Cover Sheet` correctly.