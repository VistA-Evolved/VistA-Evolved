# Phase 726-62 Verify - LOA Workbench Slice

## Goal

Verify `/cprs/admin/loa-workbench` against the live canonical stack and prove that the browser reflects real LOA workbench route truth in both authenticated and unauthenticated states.

## Verification Steps

1. Verify Docker/API health with `curl.exe -s http://127.0.0.1:3001/health` and `curl.exe -s http://127.0.0.1:3001/vista/ping`.
2. Log in as `PRO1234 / PRO1234!!` and fetch the live route set used by the LOA workbench page.
3. Browser-prove the authenticated page against the live LOA workbench state.
4. Browser-prove the unauthenticated page and confirm it renders truthful auth/load failure messaging instead of fake loaded state.
5. If fixes were required, re-run the browser pass after the patch on the same canonical stack.
6. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` after recording the slice.

## Acceptance Criteria

- Live route outputs are captured for the LOA workbench endpoints used by the page.
- The authenticated browser page matches the current live route state.
- The unauthenticated browser page degrades honestly instead of certifying fake zero-state or partial state.
- The Phase 726 audit ledger, runtime override ledger, and ops handoff artifacts are updated after proof is complete.