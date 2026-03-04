# Phase 66 Summary -- Production IAM v1

## What Changed

- Added pluggable Identity Provider (IdP) abstraction layer (`apps/api/src/auth/idp/`)
- Implemented OIDC authorization code flow provider (`oidc-idp.ts`)
- Implemented SAML-via-broker provider (app speaks OIDC to Keycloak, Keycloak speaks SAML upstream) (`saml-broker-idp.ts`)
- Added VistA session binding -- links OIDC/SAML identity session to VistA RPC broker for clinical access (`vista-binding.ts`)
- Created provider registry with health checks (`index.ts`)
- Added 6 new routes under `/auth/idp/*` (`idp-routes.ts`)
- Extended audit types for IdP auth events (standard + immutable)
- Added 4 IAM capabilities to `capabilities.json`
- Wired into `index.ts` (import + init + register)

## How to Test Manually

```bash
# 1. List providers (empty without IdP env vars)
curl http://127.0.0.1:3001/auth/idp/providers

# 2. Health check
curl http://127.0.0.1:3001/auth/idp/health

# 3. With Keycloak running + IDP_OIDC_* env vars:
#    Navigate to http://127.0.0.1:3001/auth/idp/authorize/oidc
#    Complete login at IdP, callback creates session
#    POST /auth/idp/vista-bind with VistA creds to enable clinical access
```

## Verifier Output

- Script: `scripts/verify-phase66-iam.ps1`
- Result: **86/86 PASS, 0 FAIL**

## Follow-ups

- Wire OIDC/SAML flow into web app login page UI (provider selector)
- Add end-to-end test with Keycloak container running
- Portal OIDC support (patient-facing)
- Passkey/WebAuthn integration with IdP abstraction
