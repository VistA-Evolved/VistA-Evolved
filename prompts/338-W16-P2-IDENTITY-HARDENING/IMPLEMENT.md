# Phase 338 — W16-P2 — Enterprise Identity Hardening — IMPLEMENT

## Objective
Harden the authentication and session infrastructure with step-up auth policy,
MFA enforcement hooks, session security controls, and device/session management.

## What Changed
1. **`apps/api/src/auth/step-up-auth.ts`** — Step-up authentication policy model
   - Actions classified by assurance level (standard / elevated / critical)
   - Elevated actions require recent auth (< 5 min) or MFA
   - Critical actions require both recent auth AND MFA
   - Configurable per-action via `STEP_UP_POLICY` map

2. **`apps/api/src/auth/mfa-enforcement.ts`** — MFA enforcement hooks
   - `MfaStatus` tracking: enrolled, verified timestamp, method
   - `checkMfaRequired()` — determines if MFA is needed for an action
   - `recordMfaVerification()` — stamps MFA completion on session
   - `MFA_POLICY` config: required roles, grace period, exempt actions
   - Feature-flagged via `MFA_ENFORCEMENT_ENABLED` env var

3. **`apps/api/src/auth/session-security.ts`** — Session hardening controls
   - Device fingerprint (hashed user-agent + accept-language + IP prefix)
   - Max concurrent sessions per user (configurable, default 5)
   - Session security event log (login, logout, rotation, mfa, step-up)
   - Fingerprint drift detection (warning on minor change, revoke on major)
   - `enforceConcurrentSessionLimit()` — evicts oldest sessions when exceeded

4. **`apps/api/src/routes/session-management.ts`** — Session management endpoints
   - `GET /auth/sessions` — list active sessions for current user
   - `DELETE /auth/sessions/:id` — revoke a specific session
   - `POST /auth/sessions/revoke-all` — revoke all sessions except current
   - `GET /auth/security-events` — session security event log (admin)

5. **PG migration v33** — `phase338_identity_hardening`
   - `session_device_fingerprint` table (session_id, fingerprint_hash,
     user_agent_hash, ip_prefix, created_at)
   - `session_security_event` table (id, tenant_id, user_id, session_id,
     event_type, detail, created_at)
   - `session_mfa_state` table (session_id, mfa_method, verified_at, expires_at)

6. **Updated `server-config.ts`** — New config sections for step-up, MFA, session security

## Files Touched
- `apps/api/src/auth/step-up-auth.ts` (NEW)
- `apps/api/src/auth/mfa-enforcement.ts` (NEW)
- `apps/api/src/auth/session-security.ts` (NEW)
- `apps/api/src/routes/session-management.ts` (NEW)
- `apps/api/src/platform/pg/pg-migrate.ts` (EDIT — add v33)
- `apps/api/src/config/server-config.ts` (EDIT — add identity hardening config)
- `apps/api/src/middleware/security.ts` (EDIT — add session-management auth rules)
- `prompts/338-W16-P2-IDENTITY-HARDENING/` (NEW — prompt folder)
