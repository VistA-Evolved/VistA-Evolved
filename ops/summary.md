# Phase 15B: Enterprise Hardening — VistA-first Security

## What Changed (Phase 15B — supersedes Phase 15)

### 15B-Security — Auth Gateway + CORS Lockdown + Response Scrubbing
- Modified `apps/api/src/middleware/security.ts`: Auth gateway with path-based rules (none/session/admin), CORS origin allowlist (`ALLOWED_ORIGINS`), origin check for state-changing requests, centralized response scrubber (`sanitizeClientError`), error handler no longer leaks stack traces
- Modified `apps/api/src/index.ts`: CORS locked to `corsOriginValidator`, `auditActor(request)` replaces all `{ duz: "system" }`, `safeErr()` helper, `safeCallRpc`/`safeCallRpcWithList` imported
- Modified `apps/api/src/auth/auth-routes.ts`: `rotateSession()` on login, token removed from response body, login error hardcoded to "Authentication failed"
- Modified `apps/api/src/lib/logger.ts`: `AsyncLocalStorage` for concurrency-safe request IDs
- Modified `apps/api/src/lib/rpc-resilience.ts`: `safeCallRpc()` and `safeCallRpcWithList()` drop-in wrappers
- Modified `apps/api/src/lib/audit.ts`: Added `security.origin-rejected` action
- Modified `apps/api/src/routes/write-backs.ts`: Replaced `console.log` with structured logger

### Prompts Directory Repair
- Renamed `12-PHASE-13` → `15-PHASE-13`, `15-PHASE-14` → `16-PHASE-14`, `16-PHASE-15` → `17-PHASE-15`
- Fixed file prefixes in `14-PHASE-12-CPRS-PARITY-WIRING` from 12-xx to 14-xx
- Updated all internal references (verifier scripts, ops artifacts)

### Previous 15A - Security Baseline
- New `apps/api/src/lib/logger.ts`: Structured JSON/text logger with credential/PHI redaction (SSN, Bearer tokens, access codes)
- New `apps/api/src/lib/validation.ts`: Zod schemas for all POST bodies (LoginBodySchema, PatientSearchQuerySchema, etc.)
- New `apps/api/src/middleware/security.ts`: Request IDs, security headers, rate limiting (200 general/60s, 10 login/60s), global error handler, graceful shutdown
- Modified `apps/api/src/auth/session-store.ts`: Configurable TTLs (absolute + idle), session rotation
- Modified `apps/api/src/auth/auth-routes.ts`: Zod validation, structured logging, audit events on login/logout/failure

### 15B - RPC Reliability
- New `apps/api/src/lib/rpc-resilience.ts`: Circuit breaker (closed->open after 5 failures, half-open after 30s), per-RPC timeouts (15s), retries (max 2), TTL cache, per-RPC metrics (calls, successes, failures, avgDuration, p95)

### 15C - Audit Logging (HIPAA Posture)
- New `apps/api/src/lib/audit.ts`: 40+ typed audit actions, memory/file/stdout sinks, query + stats API
- Modified `apps/api/src/index.ts`: Audit wired into ALL 12 clinical endpoints (patient-search, demographics, allergies, vitals, notes, medications, problems + all write-backs)
- Modified `apps/api/src/routes/ws-console.ts`: Migrated from local audit to centralized system
- Modified `apps/api/src/routes/write-backs.ts`: Migrated to centralized audit (dual-write pattern)

### 15D - Observability
- New endpoints: `/health` (uptime, version), `/ready` (VistA probe), `/metrics` (circuit breaker + RPC stats), `/audit/events`, `/audit/stats`
- Admin endpoints: `/admin/circuit-breaker/reset`, `/admin/cache/invalidate`
- Security headers on every response: X-Request-Id, nosniff, DENY, HSTS, no-store

### 15E - UI Reliability
- New `apps/web/src/components/ui/ErrorBoundary.tsx`: ErrorBoundary + LoadingPanel + EmptyState
- New `apps/web/src/lib/useDebounce.ts`: Debounce hook
- Modified CPRS layout + chart tab pages: wrapped in ErrorBoundary

### 15F - Compliance Configuration
- New `apps/api/src/config/server-config.ts`: Centralized config for sessions, logging, PHI, audit, RPC circuit breaker, cache, rate limits

### 15G - Documentation
- New prompt: `prompts/17-PHASE-15-ENTERPRISE-HARDENING/17-01-enterprise-hardening-IMPLEMENT.md`
- New prompt: `prompts/17-PHASE-15-ENTERPRISE-HARDENING/17-99-enterprise-hardening-VERIFY.md`
- New runbook: `docs/runbooks/enterprise-hardening-phase15.md`
- New verifier: `scripts/verify-phase1-to-phase15-enterprise-hardening.ps1`

## How to Test Manually

```bash
# Start API
cd apps/api && npx tsx src/index.ts

# Health + observability
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/metrics
curl http://127.0.0.1:3001/audit/stats

# Security headers
curl -v http://127.0.0.1:3001/health 2>&1 | grep -i "x-request-id"

# Zod validation (400 + field errors)
curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "{}"
```

## Verifier Output

```
Phase 15B Enterprise Hardening Verification
PASS: TBD (run scripts/verify-phase15b-enterprise-hardening.ps1)
```

## Follow-ups
- Wire `safeCallRpc`/`safeCallRpcWithList` into all 12 endpoint handlers
- Production audit sink (file/SIEM instead of memory)
- RBAC with VistA security keys
- TLS termination / reverse proxy
- CSRF token implementation
- Log aggregation (ELK/Splunk/CloudWatch)
