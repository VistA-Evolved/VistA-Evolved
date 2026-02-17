# Phase 15: Enterprise Hardening — VERIFY

## Automated Checks (run via `scripts/verify-latest.ps1`)

### 15A — Security Baseline
- [ ] `apps/api/src/lib/logger.ts` exists and exports `log`
- [ ] `apps/api/src/lib/validation.ts` exists and exports `validate`, `LoginBodySchema`
- [ ] `apps/api/src/middleware/security.ts` exists and exports `registerSecurityMiddleware`
- [ ] POST /auth/login with `{}` body returns 400 + Zod field errors
- [ ] Every response includes `X-Request-Id`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] Session store uses configurable TTLs from `server-config.ts`

### 15B — RPC Reliability
- [ ] `apps/api/src/lib/rpc-resilience.ts` exists, exports `resilientRpc`, `cachedRpc`, `getCircuitBreakerStats`
- [ ] GET /metrics returns circuit breaker state + per-RPC stats

### 15C — Audit Logging
- [ ] `apps/api/src/lib/audit.ts` exists, exports `audit`, `queryAuditEvents`, `getAuditStats`
- [ ] GET /audit/stats returns at least `system.startup` action count
- [ ] GET /audit/events returns array with structured events
- [ ] Patient-search, demographics, allergies, vitals, notes, medications, problems endpoints produce audit events
- [ ] ws-console uses centralized audit (no local `auditLog` array)
- [ ] write-backs uses centralized audit (dual-write pattern)

### 15D — Observability
- [ ] GET /health returns `{ ok: true, uptime, version: "phase-15", timestamp }`
- [ ] GET /ready returns VistA probe status
- [ ] GET /metrics returns RPC health summary
- [ ] Response headers include `Strict-Transport-Security`

### 15E — UI Reliability
- [ ] `apps/web/src/components/ui/ErrorBoundary.tsx` exists
- [ ] `apps/web/src/lib/useDebounce.ts` exists
- [ ] CPRS layout wraps children in ErrorBoundary
- [ ] Chart tab page wraps TabContent in ErrorBoundary

### 15F — Compliance Config
- [ ] `apps/api/src/config/server-config.ts` exports SESSION_CONFIG, LOG_CONFIG, PHI_CONFIG, AUDIT_CONFIG, RPC_CONFIG, CACHE_CONFIG, RATE_LIMIT_CONFIG

### 15G — Docs
- [ ] Prompt file exists at `prompts/17-PHASE-15-ENTERPRISE-HARDENING/17-01-*.md`
- [ ] Verify file exists at `prompts/17-PHASE-15-ENTERPRISE-HARDENING/17-99-*.md`
- [ ] Runbook exists at `docs/runbooks/enterprise-hardening-phase15.md`

### 15H — Regression
- [ ] API compiles: `cd apps/api && npx tsc --noEmit` → 0 errors
- [ ] Web compiles: `cd apps/web && npx tsc --noEmit` → 0 errors
- [ ] Phase 10–14 verifier still passes (run `scripts/verify-latest.ps1`)

## Manual Smoke Test

```bash
# Start API
cd apps/api && npx tsx src/index.ts

# 1. Health
curl http://127.0.0.1:3001/health
# Expect: { ok: true, uptime: ..., version: "phase-15" }

# 2. Security headers
curl -v http://127.0.0.1:3001/health 2>&1 | grep -i "x-request-id\|x-content-type\|x-frame"

# 3. Validation
curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "{}"
# Expect: 400 with field-level errors

# 4. Metrics
curl http://127.0.0.1:3001/metrics
# Expect: circuitBreaker, cacheSize, rpcMetrics

# 5. Audit
curl http://127.0.0.1:3001/audit/stats
# Expect: system.startup in actionCounts
```
