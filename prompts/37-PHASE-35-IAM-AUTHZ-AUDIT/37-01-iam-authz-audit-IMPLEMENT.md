# Phase 35 — Enterprise IAM, Policy Authorization & Immutable Audit

## User Request

Implement enterprise-grade authentication + authorization + audit logging in a VistA-first way:
1. Add Keycloak IdP for OIDC authentication (web + API).
2. Add OPA-style policy-based authorization for API actions.
3. Add immutable, append-only audit events for security-relevant actions.
4. Add biometric abstraction (passkeys via WebAuthn first, face optional).
5. Maintain backward compatibility with Phase 33 functionality.
6. VistA-first: continue using RPC Broker contexts/registered RPCs.

## Implementation Steps

### 0. Inventory (completed)
- Current auth: VistA RPC XUS AV CODE + in-memory session store
- Current RBAC: 3 separate systems (core, imaging, analytics)
- Current audit: 3 separate stores (central, imaging, portal)
- Session: httpOnly cookie, 32-byte random tokens, no JWT

### 1. Infrastructure
- `services/keycloak/docker-compose.yml` — Keycloak + PostgreSQL
- `infra/keycloak/realm-export.json` — Realm config with roles
- `infra/keycloak/README.md` — Setup instructions
- `infra/opa/policy/` — OPA policy bundles

### 2. OIDC/JWT Auth Layer (API)
- `apps/api/src/auth/oidc-provider.ts` — JWKS validation, token introspection
- `apps/api/src/auth/jwt-validator.ts` — JWT verification with JWKS
- Update `security.ts` auth gateway to accept JWT Bearer tokens
- Backward-compatible: accept both legacy session cookies AND JWT

### 3. Policy-Based Authorization
- `apps/api/src/auth/policy-engine.ts` — Policy evaluation engine
- `apps/api/src/auth/policies/` — Role/action/resource policy definitions
- Every route declares action string; policy engine evaluates allow/deny

### 4. Immutable Audit Store
- `apps/api/src/lib/immutable-audit.ts` — Hash-chained append-only audit
- Enhanced audit events without PHI payloads
- File + memory sinks with rotation

### 5. Biometric Abstraction
- `apps/api/src/auth/biometric/` — Provider interface + implementations
- PasskeysProvider (Keycloak WebAuthn)
- FaceVerificationProvider (disabled, scaffold only)

### 6. Audit Viewer
- `apps/web/src/app/cprs/admin/audit-viewer/page.tsx`

### 7. Web OIDC Integration
- Update session context to support OIDC tokens
- Login page supports both VistA-direct and OIDC flows

## Files Touched

### New Files
- `services/keycloak/docker-compose.yml`
- `infra/keycloak/realm-export.json`
- `infra/keycloak/README.md`
- `infra/opa/policy/authz.rego`
- `infra/opa/policy/data.json`
- `apps/api/src/auth/oidc-provider.ts`
- `apps/api/src/auth/jwt-validator.ts`
- `apps/api/src/auth/policy-engine.ts`
- `apps/api/src/auth/policies/default-policy.ts`
- `apps/api/src/auth/biometric/types.ts`
- `apps/api/src/auth/biometric/passkeys-provider.ts`
- `apps/api/src/auth/biometric/face-provider.ts`
- `apps/api/src/auth/biometric/index.ts`
- `apps/api/src/lib/immutable-audit.ts`
- `apps/web/src/app/cprs/admin/audit-viewer/page.tsx`
- `docs/runbooks/phase35-iam-authz-audit.md`
- `scripts/verify-phase35-iam-authz-audit.ps1`

### Modified Files
- `apps/api/src/middleware/security.ts` — JWT validation path
- `apps/api/src/auth/auth-routes.ts` — OIDC login endpoint
- `apps/api/src/auth/session-store.ts` — Extended session types
- `apps/api/src/config/server-config.ts` — OIDC/OPA config
- `apps/api/src/index.ts` — Register new routes
- `apps/web/src/stores/session-context.tsx` — OIDC support
- `AGENTS.md` — Phase 35 architecture notes
- `scripts/verify-latest.ps1` — Delegate to Phase 35

## Verification Steps

1. Keycloak infra: docker-compose up runs without errors
2. JWT validation: rejects invalid tokens, accepts valid
3. Policy engine: denies unauthorized, allows authorized
4. Immutable audit: hash chain verifies, no PHI in events
5. Biometric scaffold: passkey types exported, face OFF by default
6. Audit viewer: page renders for admin role
7. Backward compatibility: existing login still works
8. No console.log added (structured logger only)
