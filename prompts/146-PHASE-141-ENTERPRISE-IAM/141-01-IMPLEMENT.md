# Phase 141 — Enterprise IAM Posture (OIDC Default + Break-Glass + Hardening)

## User Request

Implement enterprise IAM posture with four main components:

- A) Default auth mode policy: AUTH_MODE=oidc|dev_local, force oidc in rc/prod
- B) Role mapping + tenant isolation with IdP group mapping
- C) Enterprise break-glass flow: request/approve/revoke endpoints, immutable audit, admin UI
- D) SCIM readiness: placeholder connector interface + docs only
- Session hardening: secure cookies, rotation, CSRF posture

## Implementation Steps

### A — Auth Mode Policy

1. Create `apps/api/src/auth/auth-mode-policy.ts` — AUTH_MODE env var (oidc|dev_local)
2. In rc/prod runtime modes: require AUTH_MODE=oidc, fail fast if OIDC not configured
3. Wire into startup validation in `index.ts`

### B — Role Mapping + Tenant Isolation

4. Create `apps/api/src/auth/idp-role-mapper.ts` — map IdP claims to UserRole + tenant
5. Enforce tenant isolation in OIDC sessions (no cross-tenant escalation)

### C — Enterprise Break-Glass

6. Create `apps/api/src/auth/enterprise-break-glass.ts` — in-memory store with audit
7. Create `apps/api/src/routes/enterprise-break-glass-routes.ts` — 3 endpoints:
   - POST /admin/break-glass/request
   - POST /admin/break-glass/approve
   - POST /admin/break-glass/revoke
8. Add audit actions + capabilities
9. Wire routes into index.ts + AUTH_RULES

### D — SCIM Readiness

10. Create `apps/api/src/auth/scim-connector.ts` — placeholder interface
11. Document in runbook

### Session Hardening

12. Verify/enhance cookie security posture
13. Add new audit actions to immutable-audit.ts

### UI

14. Create admin break-glass management page

## Verification

- TSC clean
- Build clean
- Gauntlet FAST + RC pass
- All new endpoints return expected responses

## Files Touched

- apps/api/src/auth/auth-mode-policy.ts (NEW)
- apps/api/src/auth/idp-role-mapper.ts (NEW)
- apps/api/src/auth/enterprise-break-glass.ts (NEW)
- apps/api/src/auth/scim-connector.ts (NEW)
- apps/api/src/routes/enterprise-break-glass-routes.ts (NEW)
- apps/api/src/lib/immutable-audit.ts (EDIT — new audit actions)
- apps/api/src/middleware/security.ts (EDIT — AUTH_RULES for break-glass)
- apps/api/src/platform/store-policy.ts (EDIT — store entry)
- apps/api/src/index.ts (EDIT — import + register)
- config/capabilities.json (EDIT — new capabilities)
- apps/web/src/app/cprs/admin/break-glass/page.tsx (NEW)
- docs/runbooks/phase141-enterprise-iam.md (NEW)
