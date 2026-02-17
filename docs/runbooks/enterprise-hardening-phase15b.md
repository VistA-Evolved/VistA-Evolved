# Enterprise Hardening Phase 15B — VistA-first Security Runbook

## Overview

Phase 15B closes security gaps identified in the Phase 15 audit. It follows a
"VistA-first" security approach: all fixes reuse existing VistA RPC Broker
patterns and Fastify infrastructure rather than inventing new middleware.

## What Changed

### Security Fixes (10 critical gaps closed)

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | All clinical endpoints unauthenticated | Auth gateway hook with path-based rules | `security.ts` |
| 2 | CORS `origin: true` reflects any origin | Allowlist-based origin validator | `security.ts`, `index.ts` |
| 3 | Admin/audit endpoints unprotected | Admin role requirement on /admin/ and /audit/ | `security.ts` |
| 4 | Token in login response body (XSS vector) | Token removed from response body; cookie-only | `auth-routes.ts` |
| 5 | rotateSession() never called (fixation risk) | rotateSession on login | `auth-routes.ts` |
| 6 | 42 catch blocks leak err.message | Centralized response scrubber `onSend` hook | `security.ts` |
| 7 | Audit actor always `{ duz: "system" }` | `auditActor(request)` reads session | `index.ts` |
| 8 | No origin validation for write requests | Origin check hook for POST/PUT/DELETE/PATCH | `security.ts` |
| 9 | console.log bypass in write-backs | Replaced with structured logger | `write-backs.ts` |
| 10 | Module-global requestId not concurrency-safe | AsyncLocalStorage for request ID tracking | `logger.ts` |

### Prompts Directory Ordering Fix

| Old Path | New Path | Reason |
|----------|----------|--------|
| `12-PHASE-13-CPRS-OPERATIONALIZATION` | `15-PHASE-13-CPRS-OPERATIONALIZATION` | Folder 12 was used twice |
| `15-PHASE-14-PARITY-CLOSURE` | `16-PHASE-14-PARITY-CLOSURE` | Shifted to make room |
| `16-PHASE-15-ENTERPRISE-HARDENING` | `17-PHASE-15-ENTERPRISE-HARDENING` | Shifted to make room |
| `14-PHASE-12-CPRS-PARITY-WIRING` file prefixes | 12-xx → 14-xx | Prefixes must match folder number |

### New Resilient RPC Wrappers

| Function | Purpose |
|----------|---------|
| `safeCallRpc(name, params, opts?)` | Drop-in for `callRpc` with timeout + circuit breaker + retry |
| `safeCallRpcWithList(name, params, opts?)` | Drop-in for `callRpcWithList` with resilience |

Both live in `apps/api/src/lib/rpc-resilience.ts` and are imported in `index.ts`.

## Auth Gateway Rules

| Path Pattern | Auth Required | Notes |
|-------------|---------------|-------|
| `/health`, `/ready`, `/vista/ping`, `/metrics`, `/auth/*` | None | Public endpoints |
| `/admin/*`, `/audit/*` | Admin role | Admin-only |
| `/vista/*`, `/ws/*` | Session | Authenticated clinical |

## CORS Configuration

Controlled by `ALLOWED_ORIGINS` env var (comma-separated). Defaults:
```
http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
```

## How to Test

### Security headers
```bash
curl -v http://127.0.0.1:3001/health 2>&1 | grep -E "x-request-id|x-content-type|x-frame"
```

### Auth gateway blocks unauthenticated clinical access
```bash
# Should return 401
curl http://127.0.0.1:3001/vista/patient-search?q=SMITH
```

### Login → clinical access
```bash
# Login (cookie will be set)
curl -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# Clinical endpoint with session
curl -b cookies.txt http://127.0.0.1:3001/vista/patient-search?q=SMITH
```

### CORS rejection
```bash
curl -H "Origin: https://evil.com" -X POST http://127.0.0.1:3001/vista/add-allergy \
  -H "Content-Type: application/json" -d '{}'
# Should be rejected or return no CORS headers
```

## Verification

```powershell
.\scripts\verify-phase15b-enterprise-hardening.ps1
# Or via latest:
.\scripts\verify-latest.ps1
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ALLOWED_ORIGINS` | localhost:3000,3001 | CORS origin allowlist |
| `NODE_ENV` | development | Controls error detail level |
| `VISTA_DEBUG` | false | XWB protocol hex dumps |

## Follow-ups

- Wire `safeCallRpc`/`safeCallRpcWithList` into all 12 endpoint handlers (currently available, not yet wired)
- Production audit sink (file/SIEM)
- RBAC with VistA security keys for fine-grained access control
- TLS termination / reverse proxy
- CSRF token implementation
