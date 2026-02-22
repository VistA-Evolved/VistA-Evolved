# Phase 49 — VistA Auth Hardening + RBAC (XUS SIGNON, Least Privilege)

## User Request

Stop ad-hoc auth bugs. Align with VistA's security model where possible.

## Deliverables

A) **Auth Flow Review** — Inventory current login/session model and gaps. Ensure no credentials stored in localStorage; session tokens httpOnly cookies preferred.

B) **VistA Signon (VistA-first)** — Use existing XUS SIGNON / XUSRB* patterns already in codebase. Ensure all auth-related RPC calls go through rpcRegistry and Vivian. Add capabilities detection to handle sandbox differences gracefully.

C) **RBAC Model** — Define roles (clinician, nurse, billing, admin, patient). Implement role checks on RCM routes, gateway readiness pages, admin refresh endpoints. Add principle of least privilege docs.

D) **Session Security** — Session rotation, inactivity timeout, CSRF protection if cookies used, rate limiting on login, audit events for auth.

E) **Docs** — docs/security/auth-and-rbac.md, docs/runbooks/auth-troubleshooting.md.

## Implementation Steps

1. Create prompt file (this file)
2. Inventory existing auth code (session-store, security.ts, auth-routes, policy-engine, rpcBrokerClient)
3. Align `UserRole` type across API session-store, policy-engine, and web frontend — add `billing` and `support` roles to session store
4. Create `apps/api/src/auth/rbac.ts` — unified RBAC layer that wraps policy-engine for route-level checks
5. Add role guards to RCM routes (billing/admin only for write, session for read)
6. Add role guards to gateway readiness pages and admin refresh endpoints
7. Add CSRF token (double-submit cookie) for state-changing requests
8. Enhance login rate-limit: per-account lockout + exponential backoff
9. Verify auth RPCs in rpcRegistry (XUS SIGNON SETUP, XUS AV CODE, etc.)
10. Create docs/security/auth-and-rbac.md 
11. Create docs/runbooks/auth-troubleshooting.md
12. tsc clean, vitest, PHI scan, verify-latest

## Verification Steps

- tsc --noEmit clean
- vitest run (new RBAC unit tests pass)
- PHI field scan: npx tsx scripts/check-phi-fields.ts
- verify-latest.ps1 -SkipDocker passes
- Manual: RCM write endpoints return 403 for nurse role
- Manual: CSRF token present in cookie + validated on POST

## Files Touched

- apps/api/src/auth/session-store.ts (add billing/support roles)
- apps/api/src/auth/rbac.ts (NEW — unified RBAC helpers)
- apps/api/src/auth/auth-routes.ts (CSRF token, enhanced login)
- apps/api/src/middleware/security.ts (CSRF validation hook, account lockout)
- apps/api/src/rcm/rcm-routes.ts (add role guards)
- apps/api/src/config/server-config.ts (CSRF, lockout config)
- apps/web/src/stores/session-context.tsx (align UserRole type)
- docs/security/auth-and-rbac.md (NEW)
- docs/runbooks/auth-troubleshooting.md (NEW)
