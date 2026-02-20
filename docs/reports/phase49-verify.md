# Phase 49 VERIFY — Auth Must Be Reliable and Secure

**Date:** 2025-07-15
**Commit under test:** `ab79b1a` (Phase49: VistA auth hardening + RBAC)
**Verifier:** `scripts/verify-phase49-auth-rbac.ps1` (46 gates)
**Regression:** `scripts/verify-latest.ps1` → Phase 43 (63 gates)

---

## Result: 46/46 PASS + 63/63 Regression PASS

---

## Gate Results

### G49-1: Login + Bad Creds + Lockout (9/9)

| Gate | Description | Result |
|------|------------|--------|
| G49-1a | Login with valid creds returns ok=true + role=admin | PASS |
| G49-1b | Login response includes permissions array | PASS |
| G49-1c | Session cookie is httpOnly | PASS |
| G49-1d | CSRF cookie is not httpOnly (JS-readable) | PASS |
| G49-1e | Session token not leaked in response body | PASS |
| G49-1f | Bad creds return 401 | PASS |
| G49-1g | Account lockout returns 429 after repeated failures | PASS |
| G49-1h | Lockout response includes retryAfterMs | PASS |
| G49-1i | Nurse login returns ok + role=nurse | PASS |

### G49-2: Session + CSRF (8/8)

| Gate | Description | Result |
|------|------------|--------|
| G49-2a | GET /auth/session returns authenticated=true | PASS |
| G49-2b | Session response includes permissions | PASS |
| G49-2c | GET /auth/permissions returns role + permissions | PASS |
| G49-2d | POST without CSRF header returns 403 | PASS |
| G49-2e | POST with correct CSRF header gets past CSRF check | PASS |
| G49-2f | POST with wrong CSRF token returns 403 | PASS |
| G49-2g | Session check without cookie returns authenticated=false | PASS |
| G49-2h | Logout destroys session | PASS |

### G49-3: RBAC Route Protection (11/11)

| Gate | Description | Result |
|------|------------|--------|
| G49-3a | Admin can GET /rcm/claims (200) | PASS |
| G49-3b | Admin can POST /rcm/claims/draft (creates claim) | PASS |
| G49-3c | Admin can GET /auth/rbac-matrix | PASS |
| G49-3d | Nurse can GET /rcm/claims (rcm:read) | PASS |
| G49-3e | Nurse CANNOT POST /rcm/claims/draft (403 — no rcm:write) | PASS |
| G49-3f | Nurse CANNOT POST /rcm/payers (403 — no rcm:admin) | PASS |
| G49-3g | Nurse CANNOT GET /auth/rbac-matrix (403) | PASS |
| G49-3h | Unauthenticated /rcm/claims returns 401 | PASS |
| G49-3i | Unauthenticated POST returns 401 or 403 | PASS |
| G49-3j | Nurse permissions show rcm:read but not rcm:write | PASS |
| G49-3k | RBAC matrix has 7 roles | PASS |

### G49-4: No Credential/Token Leaks (10/10)

| Gate | Description | Result |
|------|------------|--------|
| G49-4a | No PROV123 in API route/middleware source | PASS |
| G49-4b | No PROV123 in web source (except login page.tsx) | PASS |
| G49-4c | Session cookie httpOnly=true in code | PASS |
| G49-4d | No console.log in auth source files | PASS |
| G49-4e | 404 response doesn't leak stack traces | PASS |
| G49-4f | PHI field blocklist scan clean | PASS |
| G49-4g | rbac.ts exists with ROLE_PERMISSIONS map | PASS |
| G49-4h | CSRF_CONFIG exported from server-config.ts | PASS |
| G49-4i | LOCKOUT_CONFIG has maxAttempts + lockoutDurationMs | PASS |
| G49-4j | AuditAction includes auth.locked and security.csrf-failed | PASS |

### G49-5: Build + Test Regression (8/8)

| Gate | Description | Result |
|------|------------|--------|
| G49-5a | tsc --noEmit clean | PASS |
| G49-5b | vitest unit tests pass | PASS |
| G49-5c | docs/security/auth-and-rbac.md exists | PASS |
| G49-5d | docs/runbooks/auth-troubleshooting.md exists | PASS |
| G49-5e | Prompt file exists | PASS |
| G49-5f | RCM routes import requirePermission from rbac.ts | PASS |
| G49-5g | UserRole has 7 roles (including billing + support) | PASS |
| G49-5h | verify-phase43 script has CSRF token extraction | PASS |

---

## Regression: verify-latest (Phase 43) — 63/63 PASS

All operational-loop gates (ack ingestion, remittance, workqueues, rules engine, security) continue to pass with auth hardening in place.

---

## Test Methodology

- Fresh API server started with `DEPLOY_SKU=FULL_SUITE` against WorldVistA Docker sandbox
- Login rate limit: 10 req/60s — script uses exactly 10 login requests within window
- Lockout test uses unique GUID-based bad username per run to avoid cross-run interference
- CSRF tests verify double-submit cookie pattern (no header → 403, correct → pass, wrong → 403)
- RBAC tests use two roles (admin via PROV123, nurse via NURSE123) across RCM endpoints
- Static analysis gates scan for credential leaks, console.log, PHI exposure, stack traces

---

## Files Delivered

- `scripts/verify-phase49-auth-rbac.ps1` — 46-gate verification script
- `docs/reports/phase49-verify.md` — this report
