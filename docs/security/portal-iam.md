# Portal IAM — Identity & Access Management

> Phase 29 — Enterprise portal identity architecture

## Overview

The Portal IAM subsystem provides patient-facing identity management that is
**separate from VistA DUZ-based clinician auth**. Portal users enroll via
username/email/password, then link to one or more VistA patient records
through a `PatientProfile` enrollment.

## Architecture

```
Browser ─────┐
             │ credentials: include (httpOnly cookie)
             ▼
  ┌──────────────────────────┐
  │  Portal IAM Routes       │  /portal/iam/*
  │  (Fastify plugin)        │
  │                          │  portal_iam_session cookie
  │  ┌──────────────────┐    │
  │  │ Portal User Store│    │  In-memory Map (dev)
  │  │ Proxy Store      │    │  -> DB / VistA DGMP (prod)
  │  │ Access Log Store │    │  -> Audit table (prod)
  │  │ CSRF Utility     │    │
  │  └──────────────────┘    │
  └──────────────────────────┘
```

## Password Policy

| Rule | Value |
|------|-------|
| Min length | 8 |
| Max length | 128 |
| Uppercase required | Yes (1+) |
| Lowercase required | Yes (1+) |
| Digit required | Yes (1+) |
| Special char required | Yes (1+) |
| Hashing | scrypt (N=16384, r=8, p=1, keyLen=64) |
| Salt | 32 random bytes |
| Storage format | `scrypt:{salt_hex}:{hash_hex}` |

## Account Lockout

- **Max failed attempts:** 5 (env: `PORTAL_IAM_MAX_FAILED_ATTEMPTS`)
- **Lockout duration:** 15 minutes (env: `PORTAL_IAM_LOCKOUT_DURATION_MS`)
- Counters reset on successful login
- Lockout timestamp stored on `PortalUser.lockedUntil`

## Rate Limiting

Auth endpoints (`/portal/iam/login`, `/portal/iam/register`) are rate-limited:
- **5 attempts per 15-minute window** per IP address
- Returns `429 Too Many Requests` with retry info

## CSRF Protection

All write endpoints require CSRF validation using the **session-bound synchronizer token** pattern (Phase 132):

1. Server generates CSRF secret at session creation, stored in the session object
2. Client calls `GET /portal/iam/csrf-token` -- receives token in JSON response body
3. Client stores token in memory, includes as `x-csrf-token` header on POST/PUT/DELETE
4. Server compares header value against session's stored `csrfSecret` (timing-safe)

No CSRF cookies are used. The token is never stored in cookies.

## Session Model

| Property | Value |
|----------|-------|
| Cookie name | `portal_iam_session` |
| Absolute TTL | 30 minutes |
| Idle TTL | 15 minutes |
| Storage | In-memory Map |
| httpOnly | Yes |
| sameSite | strict |

This is separate from the Phase 26 `portal_session` cookie. The IAM session
carries the `PortalUser` identity, while the portal session carries the
VistA patient context.

## MFA (TOTP)

Multi-factor auth is scaffolded and feature-flagged:
- Env var: `PORTAL_MFA_ENABLED=true` to activate
- Setup: `POST /portal/iam/mfa/setup` → returns TOTP secret
- Confirm: `POST /portal/iam/mfa/confirm` with code
- Login flow: if MFA enabled, login returns `{ mfaRequired: true }` and
  client must retry with `totpCode` parameter
- Dev mode: code `"000000"` always passes when `NODE_ENV !== "production"`

## Patient Profiles

A `PortalUser` can be linked to multiple patients:
- `isSelf: true` — the user's own record (enrolled at registration)
- `isSelf: false` — proxy access to another patient

Profile fields:
- `patientDfn` — VistA patient IEN
- `patientName` — display name
- `relationship` — self/parent/guardian/spouse/caregiver/legal_representative/power_of_attorney
- `accessLevel` — read_only or read_write
- `verified` — whether identity has been confirmed

## Proxy Invitations

Workflow:
1. User sends invitation (`POST /portal/iam/proxy/invite`)
2. System evaluates policy (age, sensitivity, max proxies)
3. If allowed, invitation enters `pending` state (TTL: 7 days)
4. Target patient/user accepts or declines
5. On acceptance, `PatientProfile` is added to requestor

Policy rules:
- Max 10 proxies per patient
- Minors (< 18): only parent/guardian/legal_representative allowed
- Protected minors (13–17): warning about restricted sections
- Sensitive categories (behavioral health, substance abuse, HIV, reproductive)
  evaluated via `evaluateSensitivity()` from Phase 27

Invitation statuses: `pending`, `accepted`, `declined`, `expired`, `cancelled`, `blocked_by_policy`

## Access Log

Patient-visible event log with PHI sanitization:
- **Max entries per user:** 5,000
- **Max total entries:** 100,000
- **PHI patterns stripped:** SSN, DOB, VistA LAST,FIRST names
- **Events logged:** sign_in, sign_out, view_record, export, proxy_switch, etc.

Each entry includes: actor name, event type, description, IP, user agent,
sanitized metadata, proxy flag.

## Device Sessions

Track active login sessions across devices:
- Token stored as SHA-256 hash (raw token never persisted)
- **TTL:** 30 days (env: `DEVICE_SESSION_TTL_MS`)
- User can list and revoke individual or all sessions

## API Endpoints

### Auth
- `GET /portal/iam/csrf-token` — Generate CSRF token
- `POST /portal/iam/register` — Create account
- `POST /portal/iam/login` — Sign in (with optional MFA)
- `POST /portal/iam/logout` — Sign out
- `GET /portal/iam/session` — Current session info

### Password
- `POST /portal/iam/password/change` — Change password (CSRF)
- `POST /portal/iam/password/reset` — Request reset token
- `POST /portal/iam/password/confirm` — Confirm reset

### MFA
- `POST /portal/iam/mfa/setup` — Generate TOTP secret (CSRF)
- `POST /portal/iam/mfa/confirm` — Confirm MFA setup (CSRF)
- `POST /portal/iam/mfa/disable` — Disable MFA (CSRF)

### Profiles
- `GET /portal/iam/profiles` — List linked patients
- `DELETE /portal/iam/profiles/:id` — Unlink patient (CSRF)

### Devices
- `GET /portal/iam/devices` — List device sessions
- `POST /portal/iam/devices/:id/revoke` — Revoke one (CSRF)
- `POST /portal/iam/devices/revoke-all` — Revoke all (CSRF)

### Proxy
- `POST /portal/iam/proxy/invite` — Send invitation (CSRF)
- `GET /portal/iam/proxy/invitations` — My sent invitations
- `GET /portal/iam/proxy/invitations/for-patient` — Invitations for my patients
- `POST /portal/iam/proxy/invitations/:id/respond` — Accept/decline (CSRF)
- `POST /portal/iam/proxy/invitations/:id/cancel` — Cancel invitation (CSRF)

### Activity
- `GET /portal/iam/activity` — Access log (with filters)

### Admin
- `GET /portal/iam/stats` — System statistics

## Security Boundaries

1. Portal IAM is **not VistA auth** — no DUZ, no access/verify codes
2. Session cookie is httpOnly + strict sameSite — no XSS token theft
3. CSRF on all writes — no cross-site form submissions
4. Rate limits on auth endpoints — brute force mitigation
5. Account lockout after 5 failures — credential stuffing defense
6. Password hashing with scrypt — industry-standard KDF
7. PHI sanitization in access logs — no SSN/DOB leakage
8. Device sessions hashed — raw tokens never stored
