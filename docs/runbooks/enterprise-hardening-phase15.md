# Enterprise Hardening — Phase 15 Runbook

## Overview

Phase 15 adds enterprise-grade security, observability, reliability, and HIPAA-posture
audit logging across the entire VistA-Evolved stack.

## What Changed

### New Infrastructure (6 new modules)

| Module                  | Path                                   | Purpose                                                                                                                    |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Server Config**       | `apps/api/src/config/server-config.ts` | Centralized compliance configuration (session TTLs, logging, PHI redaction, audit sinks, RPC circuit breaker, rate limits) |
| **Logger**              | `apps/api/src/lib/logger.ts`           | Structured JSON/text logger with inline credential/PHI redaction                                                           |
| **Audit**               | `apps/api/src/lib/audit.ts`            | HIPAA-posture audit events: 40+ typed actions, memory/file/stdout sinks, query API                                         |
| **RPC Resilience**      | `apps/api/src/lib/rpc-resilience.ts`   | Circuit breaker, timeouts, retries, TTL cache, per-RPC metrics                                                             |
| **Validation**          | `apps/api/src/lib/validation.ts`       | Zod schemas for all POST bodies                                                                                            |
| **Security Middleware** | `apps/api/src/middleware/security.ts`  | Request IDs, security headers, rate limiting, global error handler, graceful shutdown                                      |

### New Endpoints

| Endpoint                       | Method | Purpose                                                   |
| ------------------------------ | ------ | --------------------------------------------------------- |
| `/health`                      | GET    | Uptime, version, timestamp                                |
| `/ready`                       | GET    | VistA connectivity probe                                  |
| `/metrics`                     | GET    | Circuit breaker state, cache size, per-RPC stats          |
| `/audit/events`                | GET    | Query audit trail (filter by action, outcome, dfn, limit) |
| `/audit/stats`                 | GET    | Aggregate audit statistics                                |
| `/admin/circuit-breaker/reset` | POST   | Reset circuit breaker                                     |
| `/admin/cache/invalidate`      | POST   | Invalidate RPC cache                                      |

### Security Headers (every response)

- `X-Request-Id` — UUID correlation ID
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Cache-Control: no-store`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Rate Limiting

- General: 200 requests/minute per IP
- Login: 10 requests/minute per IP

### Audit Coverage

All clinical endpoints now produce structured audit events:

| Endpoint                      | Audit Action                     |
| ----------------------------- | -------------------------------- |
| Patient search                | `phi.patient-search`             |
| Demographics                  | `phi.demographics-view`          |
| Allergies (read)              | `phi.allergies-view`             |
| Allergies (write)             | `clinical.allergy-add`           |
| Vitals (read)                 | `phi.vitals-view`                |
| Vitals (write)                | `clinical.vitals-add`            |
| Notes (read)                  | `phi.notes-view`                 |
| Notes (write)                 | `clinical.note-create`           |
| Medications (read)            | `phi.medications-view`           |
| Medications (write)           | `clinical.medication-add`        |
| Problems (read)               | `phi.problems-view`              |
| Default patient list          | `phi.patient-list`               |
| WS Console connect/disconnect | `rpc.console-connect/disconnect` |
| WS Console RPC call           | `rpc.console-call`               |
| Write-back drafts             | `clinical.draft-create`          |
| Order sign/release            | `clinical.order-sign/release`    |
| Login/logout                  | `auth.login/logout`              |

### UI Reliability

- `ErrorBoundary` wraps CPRS layout and chart tab content
- `LoadingPanel` and `EmptyState` components for consistent UX
- `useDebounce` hook for search input throttling

## How to Test

### Prerequisites

- Docker WorldVistA running on port 9430
- `apps/api/.env.local` configured

### Start API

```powershell
cd apps/api
npx tsx src/index.ts
```

### Verify Health & Observability

```bash
# Health check
curl http://127.0.0.1:3001/health

# Metrics (circuit breaker + RPC stats)
curl http://127.0.0.1:3001/metrics

# Audit stats (should show system.startup)
curl http://127.0.0.1:3001/audit/stats
```

### Verify Security Headers

```bash
curl -v http://127.0.0.1:3001/health 2>&1 | grep -iE "x-request|x-content|x-frame|strict-transport|cache-control"
```

### Verify Validation

```bash
# Should return 400 with Zod field errors
curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "{}"
```

### Verify Audit Trail

```bash
# After running some clinical endpoints:
curl http://127.0.0.1:3001/audit/events
curl http://127.0.0.1:3001/audit/stats
```

## Configuration Reference

All settings in `apps/api/src/config/server-config.ts`:

| Setting                              | Default    | Description                        |
| ------------------------------------ | ---------- | ---------------------------------- |
| `SESSION_CONFIG.absoluteTtlMs`       | 8 hours    | Max session lifetime               |
| `SESSION_CONFIG.idleTtlMs`           | 30 minutes | Idle session timeout               |
| `LOG_CONFIG.level`                   | `info`     | Minimum log level                  |
| `AUDIT_CONFIG.sink`                  | `memory`   | Audit storage (memory/file/stdout) |
| `AUDIT_CONFIG.maxMemoryEntries`      | 5000       | Max in-memory audit events         |
| `RPC_CONFIG.callTimeoutMs`           | 15000      | RPC call timeout                   |
| `RPC_CONFIG.circuitBreakerThreshold` | 5          | Failures before circuit opens      |
| `RPC_CONFIG.circuitBreakerResetMs`   | 30000      | Time before half-open retry        |
| `RATE_LIMIT_CONFIG.generalMax`       | 200        | General requests per window        |
| `RATE_LIMIT_CONFIG.loginMax`         | 10         | Login attempts per window          |

## Follow-ups

1. **Production audit sink**: Switch from `memory` to `file` or external SIEM
2. **RPC resilience wiring**: Wire `resilientRpc()`/`cachedRpc()` into actual RPC calls (currently infrastructure-only)
3. **RBAC enforcement**: Add session-based role checks to admin endpoints
4. **TLS termination**: Add reverse proxy config for HTTPS
5. **Log aggregation**: Ship structured logs to ELK/Splunk/CloudWatch
