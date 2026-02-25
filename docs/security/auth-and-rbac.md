# VistA-Evolved Authentication & RBAC Reference

> **Phase 49** -- VistA Auth Hardening + Role-Based Access Control

---

## 1. Authentication Model

### VistA-First Authentication

All clinician authentication flows through VistA's XWB RPC Broker protocol:

1. **TCP Connect** to VistA (host/port from `VISTA_HOST` / `VISTA_PORT`)
2. **XUS SIGNON SETUP** -- broker handshake (no credentials)
3. **XUS AV CODE** -- access + verify code encrypted with XUSRB1 cipher pads
4. **XWB CREATE CONTEXT** -- application context (OR CPRS GUI CHART)
5. **XUS GET USER INFO** -- returns DUZ, username, division, facility

All auth RPCs are registered in the RPC registry (`rpcRegistry.ts`) and
cross-referenced against the Vivian index (3,754 RPCs).

### Session Management

| Property | Value | Env Override |
|----------|-------|--------------|
| Token format | `randomBytes(32).toString("hex")` (64 hex chars) | -- |
| Storage | In-memory `Map<string, SessionData>` | -- |
| Absolute TTL | 8 hours | `SESSION_ABSOLUTE_TTL_MS` |
| Idle timeout | 30 minutes | `SESSION_IDLE_TTL_MS` |
| Rotation | On every login (fixation prevention) | -- |
| Cleanup | Every 60 seconds | `SESSION_CLEANUP_MS` |
| Cookie name | `ehr_session` | `SESSION_COOKIE` |

### Cookie Security

| Property | Value |
|----------|-------|
| `httpOnly` | `true` -- no JavaScript access |
| `sameSite` | `lax` -- CSRF baseline protection |
| `secure` | `true` in production (HTTPS only) |
| `maxAge` | 8 hours (matches session TTL) |
| Token in body | **Never** -- cookie-only transport |

### CSRF Protection (Phase 49, upgraded Phase 132)

Session-bound synchronizer token pattern (OWASP recommended):

1. Server generates a random 64-hex-char CSRF secret at session creation, stored server-side in the `csrf_secret` DB column
2. Token is delivered to the client via the login JSON response body (`csrfToken` field) and via `GET /auth/csrf-token`
3. Client stores token in memory (not cookies) and sends it as `X-CSRF-Token` header on state-changing requests
4. Server validates header against the session's stored `csrfSecret` on POST/PUT/PATCH/DELETE
5. Exempt: `GET`, `HEAD`, `OPTIONS`, `/auth/*`, health checks, service callbacks

This eliminates the cookie injection attack surface of the previous double-submit cookie pattern.
Combined with `SameSite=lax` session cookie and origin-check, this provides defense-in-depth.

### Account Lockout (Phase 49)

| Property | Value | Env Override |
|----------|-------|--------------|
| Max failed attempts | 5 | `LOGIN_LOCKOUT_MAX` |
| Lockout duration | 15 minutes | `LOGIN_LOCKOUT_DURATION_MS` |
| Failure window | 15 minutes | `LOGIN_LOCKOUT_WINDOW_MS` |

Per-account lockout (keyed on access code). Resets on successful login.
Separate from per-IP rate limiting (10 req/60s on `/auth/login`).

---

## 2. Role-Based Access Control (RBAC)

### Role Definitions

| Role | Description | VistA Security Key Hint |
|------|-------------|------------------------|
| `admin` | System administrator, superuser access | `XUPROGMODE`, `XUMGR` |
| `provider` | Clinician/physician | `PROVIDER` |
| `nurse` | Nursing staff | `ORES`, `ORELSE` |
| `pharmacist` | Pharmacy staff | `PSJ RPHARM`, `PSO PHARMACIST` |
| `billing` | Revenue cycle / billing staff | `IB BILLING`, `IB EDIT BILLING INFO` |
| `clerk` | Administrative/clerical staff | (default if no key match) |
| `support` | IT support / helpdesk | (assigned via OIDC claim) |

### Role Assignment Priority

1. **VistA security keys** (if available from `XUS GET USER INFO` extensions)
2. **Name-substring matching** (fallback for Docker sandbox: PROVIDER, NURSE, PHARM)
3. **Default**: `provider` (least-harm default for authenticated users)

### Permission Matrix

| Permission | admin | provider | nurse | pharmacist | billing | clerk | support |
|------------|:-----:|:--------:|:-----:|:----------:|:-------:|:-----:|:-------:|
| `clinical:read` | Y | Y | Y | Y | Y | Y | - |
| `clinical:write` | Y | Y | Y | - | - | - | - |
| `rcm:read` | Y | Y | Y | Y | Y | Y | - |
| `rcm:write` | Y | - | - | - | Y | - | - |
| `rcm:admin` | Y | - | - | - | - | - | - |
| `imaging:read` | Y | Y | Y | Y | - | - | - |
| `imaging:write` | Y | Y | - | - | - | - | - |
| `imaging:admin` | Y | - | - | - | - | - | - |
| `analytics:read` | Y | Y | Y | Y | Y | - | Y |
| `analytics:admin` | Y | - | - | - | - | - | - |
| `admin:system` | Y | - | - | - | - | - | - |
| `audit:read` | Y | - | - | - | - | - | Y |
| `telehealth:create` | Y | Y | - | - | - | - | - |
| `telehealth:join` | Y | Y | Y | - | - | - | - |

### Principle of Least Privilege

Each role is granted the **minimum permissions** necessary for its function:

1. **Clerks** can read clinical and billing data for scheduling/registration but cannot
   modify clinical records or billing claims.

2. **Billing staff** can create/edit claims and manage payer submissions but cannot
   modify clinical data, imaging, or system configuration.

3. **Nurses** can read everything clinical and add vitals/notes but cannot manage
   billing, imaging devices, or system admin functions.

4. **Providers** have full clinical read/write plus imaging orders but no billing
   write access (billing staff handles claim submission).

5. **Support** can only view analytics dashboards and audit trails for troubleshooting.

6. **Admin** has superuser access (bypasses all permission checks).

### RCM Route Protection (Phase 49)

| Route Pattern | Method | Required Permission |
|---------------|--------|-------------------|
| `/rcm/health` | GET | `session` (any authenticated user) |
| `/rcm/payers`, `/rcm/claims`, `/rcm/edi/*` | GET | `rcm:read` |
| `/rcm/claims/draft`, `/rcm/claims/:id/submit` | POST | `rcm:write` |
| `/rcm/payers` (create), `/rcm/rules` (create) | POST | `rcm:admin` |
| `/rcm/payers/:id` (update) | PATCH | `rcm:admin` |
| `/rcm/directory/refresh` | POST | `rcm:admin` |

---

## 3. Auth Gateway (security.ts)

Path-based, first-match-wins. Four auth levels:

| Auth Level | Behavior |
|------------|----------|
| `none` | No authentication required |
| `session` | Valid session cookie required |
| `admin` | Valid session + admin role required |
| `service` | Service-to-service key (X-Service-Key header) |

See `AUTH_RULES` in `apps/api/src/middleware/security.ts` for the full route map.

---

## 4. Rate Limiting

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| General API | 200 req | 60s | Per IP |
| `/auth/login` | 10 req | 60s | Per IP |
| Portal login | 5 req | 15 min | Per IP |
| DICOMweb proxy | 120 req | 60s | Per user |
| Account lockout | 5 failures | 15 min | Per account |

---

## 5. Credential Security Checklist

- [ ] **No credentials in localStorage** -- session token is httpOnly cookie only
- [ ] **No token in response body** -- only session metadata returned on login
- [ ] **CSRF synchronizer token** -- session-bound secret + `X-CSRF-Token` header (Phase 132)
- [ ] **Session rotation on login** -- new token on every authentication
- [ ] **Idle timeout** -- 30-minute inactive session expiry
- [ ] **Absolute TTL** -- 8-hour maximum session lifetime
- [ ] **Origin check** -- state-changing requests validated against allowlist
- [ ] **Account lockout** -- 5 failures in 15 min = 15 min lockout
- [ ] **Error sanitization** -- VistA internals stripped from client responses
- [ ] **Audit trail** -- all auth events in immutable hash-chained audit log
- [ ] **No hardcoded credentials** -- only on login page, gated by NODE_ENV

---

## 6. API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | none | Authenticate with VistA |
| `/auth/logout` | POST | session | Destroy session |
| `/auth/session` | GET | session | Current session info + permissions |
| `/auth/permissions` | GET | session | RBAC permissions for current role |
| `/auth/rbac-matrix` | GET | admin | Full RBAC permission matrix |

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_ABSOLUTE_TTL_MS` | 28800000 (8h) | Session absolute lifetime |
| `SESSION_IDLE_TTL_MS` | 1800000 (30m) | Session idle timeout |
| `SESSION_COOKIE` | `ehr_session` | Session cookie name |
| `RATE_LIMIT_GENERAL` | 200 | General API rate limit per IP |
| `RATE_LIMIT_LOGIN` | 10 | Login rate limit per IP per minute |
| `LOGIN_LOCKOUT_MAX` | 5 | Failed attempts before lockout |
| `LOGIN_LOCKOUT_DURATION_MS` | 900000 (15m) | Lockout duration |
| `ALLOWED_ORIGINS` | `localhost:3000,3001` | CORS origin allowlist |
