# Phase 29 IMPLEMENT -- Patient IAM + Proxy Workflows + Access Logs

## User Request

PHASE 29 -- PATIENT IAM + PROXY WORKFLOWS + ACCESS LOGS (enterprise portal baseline)

Goal: make portal-grade identity and account controls, without breaking VistA-first.

A) Identity architecture

- Patient identity is NOT VistA DUZ. It is a portal identity mapped to patient(s) by enrollment workflow.
- Create explicit mapping entity: PortalUser <-> PatientProfile(s) (self + proxies)
- Support: password reset, account lockout after failed attempts, session/device list, MFA scaffolding (TOTP optional; can remain feature-flagged)

B) Proxy invitation workflow (enterprise parity)

- Portal user can request proxy connection: guardian/caregiver flow, patient accepts/declines
- Enforce sensitivity restrictions and age policies created in Phase 28.

C) Access logs (patient-visible)

- Show "events performed by you or your proxy" (read-only)
- Store event types: sign-in/out, view record section, export, share code create/redeem, proxy switch, message send, refill request.

D) Security posture

- Rate limits for auth endpoints
- Secure cookie sessions; CSRF defense for write actions
- Strict audit logging (PHI-safe)

E) Documentation

- docs/security/portal-iam.md
- docs/runbooks/phase29-iam.md

Commit: "Phase 29: Portal IAM + proxy workflows + access logs"

## Implementation Steps

1. Create `apps/api/src/portal-iam/` directory with:
   - types.ts -- PortalUser, PatientProfile, ProxyInvitation, AccessLogEntry, DeviceSession types
   - portal-user-store.ts -- In-memory user store, password hashing, lockout, session/device tracking
   - proxy-store.ts -- Proxy invitation CRUD, accept/decline, sensitivity/age enforcement
   - access-log-store.ts -- PHI-safe event logging, event types, per-user query
   - portal-auth.ts -- Portal auth (login, register, password reset, MFA scaffold)
   - portal-iam-routes.ts -- All IAM + proxy + access-log REST endpoints
   - csrf.ts -- CSRF token generation + validation middleware

2. Wire routes into apps/api/src/index.ts

3. Create portal UI pages:
   - apps/portal/src/app/dashboard/account/ -- Account settings, sessions, MFA
   - apps/portal/src/app/dashboard/proxy/ -- Proxy management, invitations
   - apps/portal/src/app/dashboard/activity/ -- Access log viewer

4. Documentation:
   - docs/security/portal-iam.md
   - docs/runbooks/phase29-iam.md

5. Ops artifacts: ops/phase29-summary.md, ops/phase29-notion-update.json

## Verification Steps

- All 3 apps compile clean (tsc --noEmit)
- All new files exist
- Route coverage: all endpoints registered
- No hardcoded credentials in new files
- No console.log in new files
- CSRF token generation uses crypto.randomBytes
- Password hashing uses scrypt/argon2/bcrypt (not plaintext)
- Lockout threshold defined
- Access log events are PHI-safe (no SSN/DOB)
- Proxy invitation enforces age/sensitivity policies

## Files Touched

- apps/api/src/portal-iam/\*.ts (new)
- apps/api/src/index.ts (modified)
- apps/portal/src/app/dashboard/account/page.tsx (new)
- apps/portal/src/app/dashboard/proxy/page.tsx (new)
- apps/portal/src/app/dashboard/activity/page.tsx (new)
- docs/security/portal-iam.md (new)
- docs/runbooks/phase29-iam.md (new)
- ops/phase29-summary.md (new)
- ops/phase29-notion-update.json (new)
