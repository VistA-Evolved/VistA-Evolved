# Phase 132 -- CSRF Synchronizer Token Migration

## User Request

> "CSRF token as a cookie? is that safe? shouldn't those be secure as
> The preferred method is to deliver the token in the HTML/JSON response
> and send it back via custom HTTP headers"

Migrate from double-submit cookie CSRF to OWASP-recommended session-bound
synchronizer token pattern across both EHR and Portal systems.

## Implementation Steps

1. **Audit** -- Map all CSRF touchpoints across API, portal, frontend, tests
2. **Session store** -- Add `csrfSecret` to `SessionData`, generate at creation,
   load from DB `csrf_secret` column (pre-existed in both SQLite + PG)
3. **Security middleware** -- Replace double-submit cookie hook with synchronizer
   token validation (header vs session.csrfSecret)
4. **Auth routes** -- Remove CSRF cookie setting; add `csrfToken` to login/session
   response bodies; add `GET /auth/csrf-token` endpoint
5. **IDP routes** -- Remove CSRF cookie setting from callback
6. **Portal CSRF** -- Rewrite `validateCsrf()` to take `sessionCsrfSecret` param;
   update all 10 call sites in `portal-iam-routes.ts`
7. **Frontend** -- Create shared `apps/web/src/lib/csrf.ts`; wire into
   `session-context.tsx`; replace 3 duplicate cookie-reading functions
8. **Tests** -- Update flow-catalog, qa-api-routes.test, contract.test, k6 db-load
9. **Verification scripts** -- Update 4 PowerShell scripts (phase49, 43, 99, 100)
10. **Hardening report** -- Update `hardening-routes.ts` detail text
11. **Documentation** -- Update auth-and-rbac.md, security-triage.md,
    auth-troubleshooting.md, portal-iam.md

## Verification Steps

- TypeScript clean (API + Web): PASS
- Login returns `csrfToken` in JSON body (no `ehr_csrf` cookie): PASS
- `GET /auth/csrf-token` returns session-bound token: PASS
- POST without `x-csrf-token` header: 403 PASS
- POST with correct token: passes CSRF check PASS
- POST with wrong token: 403 PASS
- Phase 131 POST /scheduling/lifecycle/transition with CSRF: 201 PASS
- Lifecycle state machine chain (requested -> waitlisted -> booked): PASS
- Invalid transition (booked -> requested): 409 PASS

## Files Touched

### API Backend

- `apps/api/src/auth/session-store.ts`
- `apps/api/src/middleware/security.ts`
- `apps/api/src/auth/auth-routes.ts`
- `apps/api/src/auth/idp/idp-routes.ts`
- `apps/api/src/config/server-config.ts`
- `apps/api/src/portal-iam/csrf.ts`
- `apps/api/src/portal-iam/portal-iam-routes.ts`
- `apps/api/src/qa/flow-catalog.ts`
- `apps/api/src/routes/hardening-routes.ts`

### Frontend

- `apps/web/src/lib/csrf.ts` (NEW)
- `apps/web/src/stores/session-context.tsx`
- `apps/web/src/app/cprs/admin/rcm/page.tsx`
- `apps/web/src/app/cprs/admin/modules/page.tsx`
- `apps/web/src/app/cprs/admin/contracting-hub/page.tsx`

### Tests

- `apps/api/tests/qa-api-routes.test.ts`
- `apps/api/tests/contract.test.ts`
- `tests/k6/db-load.js`

### Verification Scripts

- `scripts/verify-phase49-auth-rbac.ps1`
- `scripts/verify-phase43-claim-quality.ps1`
- `scripts/verify-phase99-reconciliation.ps1`
- `scripts/verify-phase100-eligibility-claimstatus.ps1`

### Documentation

- `docs/security/auth-and-rbac.md`
- `docs/security/portal-iam.md`
- `docs/runbooks/auth-troubleshooting.md`
- `docs/runbooks/security-triage.md`
