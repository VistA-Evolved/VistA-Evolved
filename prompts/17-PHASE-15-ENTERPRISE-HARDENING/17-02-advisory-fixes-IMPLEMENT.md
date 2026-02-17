# 17-02 — Phase 15B Advisory Fixes (IMPLEMENT)

## User Request

Fix the two advisory items found during Phase 15B verification:

1. **Login page exposes sandbox credentials** — The sandbox accounts table
   (PROV123, NURSE123, PHARM123) and placeholder hints are rendered
   unconditionally. Gate them behind `NODE_ENV !== 'production'`.

2. **Client stores `undefined` in localStorage for token** — Phase 15B removed
   the token from the login response body (correct for httpOnly cookie transport),
   but the web client still reads `data.session.token` and stores it. This
   stores the string `"undefined"` in localStorage and sends `Bearer undefined`
   on session resume.

## Implementation Steps

### Fix 1: Gate sandbox credentials in login UI
- File: `apps/web/src/app/cprs/login/page.tsx`
- Wrap sandbox credentials table in `{process.env.NODE_ENV !== 'production' && (...)}`
- Replace placeholder values with generic text in production

### Fix 2: Switch session-context to cookie-only auth
- File: `apps/web/src/stores/session-context.tsx`
- Remove `LS_TOKEN_KEY` and all `localStorage` token operations
- Mount effect: call `/auth/session` with `credentials: 'include'` only (cookie sent by browser)
- Login: don't read `data.session.token`, don't store in localStorage
- Logout: use `credentials: 'include'` only, no Bearer header
- Remove `token` from context interface (replaced by `authenticated` boolean)

### Fix 3: WebSocket console — use cookie auth
- File: `apps/api/src/routes/ws-console.ts`
  - Use `request.session` (set by security middleware from cookie) instead of `?token=` query param
- File: `apps/web/src/components/cprs/CPRSModals.tsx`
  - Don't pass `?token=` in WebSocket URL
  - Use `authenticated` check instead of `token` truthy check

## Verification Steps

- `pnpm exec tsc --noEmit` in `apps/web` — no type errors
- `npx tsc --noEmit` in `apps/api` — no type errors
- Manual: login page in dev mode shows sandbox table; production build would not
- Manual: login → session persists across reload (cookie-based)
- Manual: WS console connects without token in URL

## Files Touched

- `apps/web/src/app/cprs/login/page.tsx`
- `apps/web/src/stores/session-context.tsx`
- `apps/web/src/components/cprs/CPRSModals.tsx`
- `apps/api/src/routes/ws-console.ts`
- `prompts/17-PHASE-15-ENTERPRISE-HARDENING/17-02-advisory-fixes-IMPLEMENT.md`
