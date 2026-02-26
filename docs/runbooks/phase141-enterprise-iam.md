# Phase 141 — Enterprise IAM Posture Runbook

## Overview

Phase 141 adds enterprise-grade Identity and Access Management (IAM) posture
controls including:

- **Auth Mode Policy** — `AUTH_MODE` env var enforces OIDC in production
- **IdP Role Mapping** — Maps OIDC/SAML groups to platform UserRole with tenant isolation
- **Enterprise Break-Glass** — Platform-wide emergency access with admin approval workflow
- **SCIM Readiness** — Placeholder interface for future SCIM 2.0 user provisioning
- **Session Hardening** — Secure cookies, session-bound CSRF (inherited from Phase 132)

## Configuration

### Auth Mode

| Env Var | Values | Default | Description |
|---------|--------|---------|-------------|
| `AUTH_MODE` | `oidc`, `dev_local` | `dev_local` | Controls default auth mechanism |

**Runtime mode enforcement:**
- `dev`/`test` — Both `oidc` and `dev_local` are accepted
- `rc`/`prod` — Only `AUTH_MODE=oidc` is allowed. Also requires `OIDC_ENABLED=true`

### Break-Glass Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Max TTL | 4 hours | Cannot request longer sessions |
| Default TTL | 30 minutes | Applied when no `ttlMinutes` specified |
| Min reason | 10 characters | Enforced on request |
| Max active per user | 3 | Concurrent active sessions per user |
| Store | In-memory | Resets on API restart (by design for security) |

## API Endpoints

### Break-Glass

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/break-glass/request` | admin | Submit a break-glass request |
| POST | `/admin/break-glass/approve` | admin | Approve a pending request |
| POST | `/admin/break-glass/deny` | admin | Deny a pending request |
| POST | `/admin/break-glass/revoke` | admin | Revoke an active session |
| GET | `/admin/break-glass/active` | admin | List sessions (filter by ?status=) |
| GET | `/admin/break-glass/stats` | admin | Summary statistics |
| GET | `/admin/break-glass/session/:id` | admin | Get specific session |

### IAM Posture

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/iam/posture` | admin | IAM posture summary |

## Break-Glass Lifecycle

```
User → POST /admin/break-glass/request
         → status: PENDING
         
Admin → POST /admin/break-glass/approve
         → status: ACTIVE (with TTL)
         
    OR → POST /admin/break-glass/deny
         → status: DENIED

Active session → auto-expires after TTL
         → status: EXPIRED
         
Admin → POST /admin/break-glass/revoke
         → status: REVOKED
```

## IdP Role Mapping

Default mapping (Keycloak realm roles):

| IdP Group | Platform Role |
|-----------|---------------|
| vista-admin / admin | admin |
| vista-provider / provider | provider |
| vista-nurse / nurse | nurse |
| vista-pharmacist / pharmacist | pharmacist |
| vista-billing / billing | billing |
| vista-support / support | support |
| vista-clerk / clerk | clerk |
| (no match) | clerk (fallback) |

## SCIM 2.0 Readiness

The `ScimConnector` interface is defined in `apps/api/src/auth/scim-connector.ts`.
Current implementation is a stub that returns 501 for all operations.

Future SCIM endpoints (not yet active):
- `POST /scim/v2/Users` — Create user
- `GET /scim/v2/Users/:id` — Read user
- `PUT /scim/v2/Users/:id` — Replace user
- `PATCH /scim/v2/Users/:id` — Update user
- `DELETE /scim/v2/Users/:id` — Deactivate user
- `GET /scim/v2/ServiceProviderConfig` — Capability discovery

## Admin UI

Navigate to: `/cprs/admin/break-glass`

Three tabs:
1. **Sessions** — View/approve/deny/revoke break-glass sessions
2. **Posture** — View auth mode, role mapping, and break-glass stats
3. **Request** — Submit a new break-glass request

## Testing

```bash
# Login as admin
curl -s -c cookies.txt http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Check IAM posture
curl -s -b cookies.txt http://localhost:3001/admin/iam/posture | jq .

# Request break-glass
curl -s -b cookies.txt http://localhost:3001/admin/break-glass/request \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: <token>" \
  -d '{"targetModule":"imaging","targetPermission":"imaging_admin","reason":"Emergency radiology access needed for critical patient"}'

# List sessions
curl -s -b cookies.txt http://localhost:3001/admin/break-glass/active | jq .
```

## Audit Trail

All break-glass events are recorded in the immutable audit chain:
- `iam.break-glass.request` — New request submitted
- `iam.break-glass.approve` — Request approved (includes TTL)
- `iam.break-glass.deny` — Request denied
- `iam.break-glass.revoke` — Active session revoked
- `iam.break-glass.expire` — Session auto-expired

Query via: `GET /iam/audit/events?actionPrefix=iam.break-glass`
