# Phase 726-62 Implement - CPRS Login Slice

## User Request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist, prove `/cprs/login` against the live canonical VEHU stack, patch only evidence-backed truth defects, and record the slice only after browser proof.

## Inventory

### Frontend surface

- `apps/web/src/app/cprs/login/page.tsx`
- `apps/web/src/stores/session-context.tsx`

### Backing API routes exercised by the page

- `GET /auth/session`
- `POST /auth/login`

### Backend route files

- `apps/api/src/auth/auth-routes.ts`

## Implementation Steps

1. Verify Docker, API, and `/vista/ping` health on the canonical VEHU stack before any edits.
2. Corroborate the authenticated and unauthenticated contracts for `/auth/session` and `/auth/login` as exercised by `/cprs/login`.
3. Browser-prove `/cprs/login` in unauthenticated and authenticated contexts, including the redirect behavior when a session already exists.
4. Identify any real truth defect such as broken redirect logic, misleading error handling, or a visible frontend/backend contract mismatch.
5. Apply the smallest possible fix in the login page or session context if the browser proof exposes a real defect.
6. Re-prove the affected authenticated and unauthenticated browser states after the fix.
7. Record the slice in the browser audit artifact, runtime override ledger, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` before advancing.