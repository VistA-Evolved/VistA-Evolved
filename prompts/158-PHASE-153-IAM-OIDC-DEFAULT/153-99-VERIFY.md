# Phase 153 — VERIFY: Enterprise IAM Default (OIDC Mandatory in rc/prod)

## Verification Gates

### Tier 1: Sanity

1. `validateRuntimeMode()` throws in rc/prod without OIDC_ENABLED + OIDC_ISSUER
2. `enforceAuthMode()` throws in rc/prod without AUTH_MODE=oidc
3. `validateOidcConfig()` returns errors when OIDC_CLIENT_ID missing in rc/prod
4. Dev mode starts cleanly without any OIDC vars
5. No secrets in git (no OIDC_CLIENT_SECRET in committed files)

### Tier 2: Feature Integrity

1. Posture endpoint `/posture/data-plane` returns all OIDC gates
2. `tenant_oidc_mapping` table created by migration v20
3. Table included in RLS policy array
4. `.env.example` documents all OIDC vars
5. Cookie `secure` flag checks PLATFORM_RUNTIME_MODE not just NODE_ENV

### Tier 3: Regression

1. Gauntlet fast: all pass
2. Gauntlet rc: baseline or better (18P/0F/1S/2W)
3. TypeScript: 0 errors
4. No new console.log statements
5. No PHI in auth-related log calls
