# Phase 29 — Portal IAM Runbook

> Patient IAM + Proxy Workflows + Access Logs

## Prerequisites

- VistA Docker sandbox running (`services/vista/docker-compose.yml`)
- API server running on port 3001
- Portal app running on port 3002

## Quick Start

```bash
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Start Portal
cd apps/portal
pnpm dev
```

The API seeds two dev portal users on startup:

- `patient1` / `Patient1!` → DFN 100022
- `patient2` / `Patient2!` → DFN 100033

## Testing IAM Flows

### 1. Registration

```bash
# Get CSRF token
curl -c cookies.txt http://localhost:3001/portal/iam/csrf-token

# Register new user
CSRF=$(grep csrf_token cookies.txt | awk '{print $NF}')
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST http://localhost:3001/portal/iam/register \
  -d '{"username":"testuser","email":"test@example.com","password":"TestPass1!","fullName":"Test User","patientDfn":"100022","patientName":"CARTER,DAVID"}'
```

### 2. Login

```bash
curl -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/portal/iam/login \
  -d '{"username":"patient1","password":"Patient1!"}'
```

### 3. Check Session

```bash
curl -b cookies.txt http://localhost:3001/portal/iam/session
```

### 4. Password Change

```bash
CSRF=$(grep csrf_token cookies.txt | awk '{print $NF}')
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST http://localhost:3001/portal/iam/password/change \
  -d '{"currentPassword":"Patient1!","newPassword":"NewPass2@"}'
```

### 5. Proxy Invitation

```bash
# As patient1, invite proxy access to patient2's record
CSRF=$(grep csrf_token cookies.txt | awk '{print $NF}')
curl -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -X POST http://localhost:3001/portal/iam/proxy/invite \
  -d '{"patientDfn":"100033","patientName":"SMITH,JANE","relationship":"caregiver","accessLevel":"read_only","reason":"Family member caregiver"}'
```

### 6. Activity Log

```bash
curl -b cookies.txt "http://localhost:3001/portal/iam/activity?limit=10"
```

### 7. Device Sessions

```bash
# List device sessions
curl -b cookies.txt http://localhost:3001/portal/iam/devices

# Revoke all other sessions
CSRF=$(grep csrf_token cookies.txt | awk '{print $NF}')
curl -b cookies.txt \
  -H "x-csrf-token: $CSRF" \
  -X POST http://localhost:3001/portal/iam/devices/revoke-all
```

### 8. System Stats

```bash
curl -b cookies.txt http://localhost:3001/portal/iam/stats
```

## Portal UI Pages

| Page          | URL                   | Description                      |
| ------------- | --------------------- | -------------------------------- |
| Family Access | `/dashboard/proxy`    | Proxy invitation management      |
| Activity Log  | `/dashboard/activity` | Patient-visible access log       |
| Account       | `/dashboard/account`  | Password change, device sessions |

## Troubleshooting

### "CSRF validation failed"

- Ensure `GET /portal/iam/csrf-token` is called first
- Include `x-csrf-token` header matching the `csrf_token` cookie value
- Token expires after 30 minutes

### "Account locked"

- 5 failed login attempts → 15 min lockout
- Wait 15 minutes or restart the API (dev mode clears in-memory store)

### "Rate limit exceeded"

- 5 auth attempts per 15 minutes per IP
- Wait for the window to expire

### "MFA required"

- Login returned `{ mfaRequired: true }`
- Re-send login with `totpCode` field
- Dev mode: use code `"000000"`

## Environment Variables

| Variable                         | Default      | Description                  |
| -------------------------------- | ------------ | ---------------------------- |
| `PORTAL_MFA_ENABLED`             | `false`      | Enable TOTP MFA              |
| `PORTAL_IAM_MAX_FAILED_ATTEMPTS` | `5`          | Lockout threshold            |
| `PORTAL_IAM_LOCKOUT_DURATION_MS` | `900000`     | Lockout duration (15 min)    |
| `DEVICE_SESSION_TTL_MS`          | `2592000000` | Device session TTL (30 days) |
| `PROXY_INVITE_TTL_MS`            | `604800000`  | Invitation TTL (7 days)      |

## Files

```
apps/api/src/portal-iam/
  types.ts               — Type definitions
  portal-user-store.ts   — User CRUD, auth, password, MFA, device sessions
  proxy-store.ts         — Proxy invitation workflow
  access-log-store.ts    — PHI-safe event logging
  csrf.ts                — CSRF double-submit cookie
  portal-iam-routes.ts   — All REST endpoints (~30 routes)

apps/portal/src/app/dashboard/
  account/page.tsx       — Account settings UI
  proxy/page.tsx         — Family access / proxy management UI
  activity/page.tsx      — Activity log viewer UI

docs/security/portal-iam.md — Security architecture document
```
