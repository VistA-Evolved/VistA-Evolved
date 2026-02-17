# Phase 15: Enterprise Hardening (Security + HIPAA Posture + Reliability + Observability)

## What Changed

### 15A - Security Baseline
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
Phase 15 Enterprise Hardening Verification
PASS: 92, FAIL: 0, WARN: 0, INFO: 0
*** ALL CHECKS PASSED - 0 WARN ***
```

INFO items:
- ORWORB UNSIG ORDERS - expected-missing on WorldVistA Docker
- ORWORB FASTUSER - expected-missing on WorldVistA Docker

## Follow-ups
- Production audit sink (file/SIEM instead of memory)
- Wire `resilientRpc()`/`cachedRpc()` into actual RPC calls
- RBAC enforcement on admin endpoints
- TLS termination / reverse proxy
- Log aggregation (ELK/Splunk/CloudWatch)
