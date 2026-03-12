# Phase 726-61 Verify - Migration Admin Slice

## Goal

Verify `/cprs/admin/migration` against the canonical VEHU-backed browser and the exact live migration API routes it uses, and record only evidence-backed truth results.

## Verification Steps

1. Confirm Docker, API, and `/vista/ping` are healthy on the canonical stack.
2. Corroborate the migration admin page against the live API routes it calls while authenticated.
3. Browser-prove the authenticated page state and any safe live interaction justified by the current data.
4. Browser-prove a fresh unauthenticated `/cprs/admin/migration` load.
5. If a defect was fixed, re-run authenticated and unauthenticated browser proof on the patched canonical stack.
6. Record the final truth in the Phase 726 artifact, runtime override ledger, ops summary, and notion update.
7. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` after the slice is recorded.

## Acceptance

- The authenticated migration admin browser state matches the live route contract it consumes.
- Any unauthenticated or failed-load state degrades honestly instead of masquerading as real migration data.
- Any recorded defect is backed by direct route corroboration and a repeat browser re-proof.