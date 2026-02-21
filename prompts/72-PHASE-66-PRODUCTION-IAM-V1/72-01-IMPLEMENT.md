# Phase 66 — Production IAM v1 (OIDC + SAML Posture)

## User Request
Close portal-plan auth gap by implementing production-ready authentication posture:
- OIDC support (real end-to-end)
- SAML via broker posture (Keycloak/AzureAD/Okta)
- Tenant-scoped sessions
- RBAC enforcement across clinician/admin/patient
- VistA session binding for clinical actions

## Implementation Steps
1. Create IdentityProvider interface in apps/api/src/auth/idp/types.ts
2. Implement OIDC provider in apps/api/src/auth/idp/oidc-idp.ts
3. Implement SAML broker posture in apps/api/src/auth/idp/saml-broker-idp.ts
4. Implement VistA session binding in apps/api/src/auth/idp/vista-binding.ts
5. Create IdP registry in apps/api/src/auth/idp/index.ts
6. Add OIDC callback + token exchange routes in apps/api/src/auth/idp/idp-routes.ts
7. Wire into index.ts
8. Update capabilities.json + actionRegistry
9. Create runbook docs/runbooks/auth-oidc-saml.md
10. Create verification script scripts/verify-phase66-iam.ps1

## Verification Steps
- verify-latest.ps1 passes (regression)
- verify-phase66-iam.ps1 passes (all G66-* gates)
- TSC clean
- No secrets in code

## Files Touched
- apps/api/src/auth/idp/types.ts (NEW)
- apps/api/src/auth/idp/oidc-idp.ts (NEW)
- apps/api/src/auth/idp/saml-broker-idp.ts (NEW)
- apps/api/src/auth/idp/vista-binding.ts (NEW)
- apps/api/src/auth/idp/index.ts (NEW)
- apps/api/src/auth/idp/idp-routes.ts (NEW)
- apps/api/src/index.ts (MODIFIED - register idpRoutes)
- config/capabilities.json (MODIFIED - add IAM capabilities)
- docs/runbooks/auth-oidc-saml.md (NEW)
- scripts/verify-phase66-iam.ps1 (NEW)
- scripts/verify-latest.ps1 (MODIFIED - delegate to phase 66)
- artifacts/phase66/inventory.json (NEW)
- artifacts/phase66/iam-plan.json (NEW)
- prompts/72-PHASE-66-PRODUCTION-IAM-V1/72-01-IMPLEMENT.md (NEW)
- prompts/72-PHASE-66-PRODUCTION-IAM-V1/72-99-VERIFY.md (NEW)
