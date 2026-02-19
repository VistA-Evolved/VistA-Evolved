# Phase 35 — Enterprise IAM, Policy Authorization & Immutable Audit

## Overview

Phase 35 introduces enterprise-grade authentication, authorization, and audit
logging for VistA-Evolved, including:

- **OIDC/JWT authentication** via Keycloak identity provider
- **Policy-based authorization** (OPA-compatible, in-process engine)
- **Immutable audit trail** (SHA-256 hash-chained, dual-sink)
- **Biometrics/passkey abstraction** (WebAuthn via Keycloak, face scaffold)

## Architecture

```
┌────────────────┐     ┌──────────────────┐    ┌──────────────┐
│  Browser / App │────►│  Keycloak (OIDC)  │    │  VistA RPC   │
│   (JWT or      │     │  port 8180        │    │  port 9430   │
│    session)     │     └──────────────────┘    └──────────────┘
└───────┬────────┘              │                      │
        │                       ▼                      ▼
        │              ┌──────────────────────────────────┐
        └─────────────►│  Fastify API (port 3001)          │
                       │  ┌────────────┐ ┌──────────────┐ │
                       │  │ JWT Valid.  │ │ Session Auth │ │
                       │  └─────┬──────┘ └──────┬───────┘ │
                       │        ▼                ▼         │
                       │  ┌──────────────────────────────┐ │
                       │  │ Policy Engine (in-process)    │ │
                       │  │ default-deny, role-action map │ │
                       │  └──────────┬───────────────────┘ │
                       │             ▼                      │
                       │  ┌──────────────────────────────┐ │
                       │  │ Immutable Audit (hash-chain)  │ │
                       │  │ memory + JSONL file           │ │
                       │  └──────────────────────────────┘ │
                       └──────────────────────────────────┘
```

## Quick Start

### 1. Start Keycloak (optional — VistA RPC auth still works)

```powershell
cd services/keycloak
docker compose up -d
```

Keycloak Admin: http://localhost:8180/admin (admin / admin)

### 2. Configure OIDC (optional)

Add to `apps/api/.env.local`:

```env
OIDC_ENABLED=true
OIDC_ISSUER=http://localhost:8180/realms/vista-evolved
OIDC_CLIENT_ID=vista-evolved-api
OIDC_AUDIENCE=vista-evolved-api
```

### 3. Start API

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

### 4. Verify IAM endpoints

```powershell
# Health check (no auth)
curl http://localhost:3001/iam/health

# OIDC config (no auth)
curl http://localhost:3001/iam/oidc/config

# Login first
curl -c cookies.txt -X POST http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Audit events (admin only)
curl -b cookies.txt http://localhost:3001/iam/audit/events

# Audit stats
curl -b cookies.txt http://localhost:3001/iam/audit/stats

# Chain verification
curl -b cookies.txt http://localhost:3001/iam/audit/verify

# Policy capabilities (any user)
curl -b cookies.txt http://localhost:3001/iam/policy/capabilities

# Biometric providers
curl -b cookies.txt http://localhost:3001/iam/biometric/providers
```

## Components

### OIDC Provider (`apps/api/src/auth/oidc-provider.ts`)

- Reads env vars: `OIDC_ENABLED`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, etc.
- Caches OIDC discovery document for 5 minutes
- Extracts roles from `realm_access.roles` claim
- Maps claims to VistA user metadata (DUZ, facility, tenant)

### JWT Validator (`apps/api/src/auth/jwt-validator.ts`)

- Zero-dependency (Node.js crypto only)
- Supports RS256/384/512 and ES256/384/512
- JWKS cache with auto-refresh on kid miss (10-min TTL)
- Validates: signature, exp, nbf, iss, aud, clock skew (30s)

### Policy Engine (`apps/api/src/auth/policy-engine.ts`)

- Default-deny architecture
- ~40 action→roles mappings
- ~30 URL→action route mappings
- Evaluation order: admin superuser → tenant isolation → break-glass →
  patient own-data → role-action → wildcard → deny
- OPA-compatible structure (migrate to OPA sidecar for production)

### Immutable Audit (`apps/api/src/lib/immutable-audit.ts`)

- SHA-256 hash chain (each entry hashes predecessor)
- Dual sink: in-memory ring buffer (10K) + JSONL file
- PHI sanitization: strips SSN, DOB, names, clinical content
- IP hashing in production
- 40+ action types (auth, context, rpc, write, policy, security, system, audit)

### Biometric Providers (`apps/api/src/auth/biometric/`)

- **PasskeysProvider**: WebAuthn via Keycloak, FIDO2 attestation
- **FaceVerificationProvider**: Disabled scaffold (needs vendor integration)
- Provider registry with runtime initialization

### Audit Viewer (`apps/web/src/app/cprs/admin/audit-viewer/page.tsx`)

- 4 tabs: Events, Stats, Chain Verification, Policy Definitions
- Admin/support access only
- Fetches from `/iam/audit/*` endpoints

## Keycloak Realm

The realm export at `infra/keycloak/realm-export.json` includes:

| Item | Details |
|------|---------|
| Realm | `vista-evolved` |
| Roles | provider, nurse, pharmacist, clerk, admin, patient, support |
| Clients | vista-evolved-web, vista-evolved-api, vista-evolved-portal |
| Dev users | provider.clyde (DUZ 87, admin), nurse.helen (DUZ 88), pharmacist.linda (DUZ 89) |
| WebAuthn | Passwordless configured as required action |

## OPA Policy

The Rego policy at `infra/opa/policy/authz.rego` provides:

- Default deny
- Admin superuser bypass
- Role-based action allows
- Tenant isolation enforcement
- Break-glass override (with audit requirement)

Use this for external OPA sidecar deployment. The in-process engine mirrors
this logic for development.

## Security Notes

1. **Never bypass the policy engine.** All actions must flow through `evaluatePolicy()`.
2. **Never log PHI.** The immutable audit sanitizes SSN, DOB, patient names.
3. **JWT secrets never in code.** Use JWKS from Keycloak discovery endpoint.
4. **Passkey data never stored locally.** All WebAuthn credential management
   is delegated to Keycloak.
5. **Face verification disabled by default.** Requires explicit vendor config.
6. **Hash chain verification** should run on every startup and periodically.
7. **OIDC is opt-in.** Set `OIDC_ENABLED=true` to activate. VistA RPC auth
   continues to work as the default path.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OIDC_ENABLED` | `false` | Enable OIDC/JWT auth path |
| `OIDC_ISSUER` | — | Keycloak realm URL |
| `OIDC_CLIENT_ID` | — | API client ID in Keycloak |
| `OIDC_JWKS_URI` | — | Override JWKS endpoint (auto-discovered if blank) |
| `OIDC_AUDIENCE` | — | Expected JWT audience |
| `PASSKEY_RP_ID` | `localhost` | WebAuthn relying party ID |
| `PASSKEY_RP_NAME` | `VistA Evolved` | WebAuthn relying party name |
| `FACE_VERIFICATION_ENABLED` | `false` | Enable face biometric |
| `FACE_VERIFICATION_VENDOR` | — | Face vendor adapter |
