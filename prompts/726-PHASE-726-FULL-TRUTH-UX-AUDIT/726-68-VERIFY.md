# Phase 726-68 Verify - Contracting Hub Slice

## Goal

Verify `/cprs/admin/contracting-hub` against the live canonical stack and prove that the browser reflects real contracting route truth in both authenticated and unauthenticated states.

## Verification Steps

1. Verify Docker/API health with `curl.exe -s http://127.0.0.1:3001/health` and `curl.exe -s http://127.0.0.1:3001/vista/ping`.
2. Log in as `PRO1234 / PRO1234!!` and fetch the live route set used by the contracting hub page.
3. Browser-prove the authenticated page against the live contracting state.
4. Browser-prove the unauthenticated page and confirm it renders truthful auth/load failure messaging instead of fake loaded state.
5. If fixes were required, re-run the browser pass after the patch on the same canonical stack.
6. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` after recording the slice.

## Expected Evidence

- Live route outputs for the contracting hub endpoints used by the page.
- Authenticated browser proof for the contracting hub sections.
- Unauthenticated browser proof for truthful degradation.
- Updated Phase 726 audit ledger, runtime override ledger, and ops handoff artifacts.