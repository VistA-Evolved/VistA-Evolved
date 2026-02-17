# Phase 15: Enterprise Hardening — IMPLEMENT

## User Request

> PHASE 15 BIG BUILD: Enterprise Hardening (Security + HIPAA posture + Reliability + Performance + Observability) with full regression gates for Phases 10–14.
>
> Non-negotiable: No regressions — All Phase 10–14 verifiers must still pass.
>
> VistA-aligned security: Prefer VistA/Kernel security mechanisms first. Web layer is session/perimeter wrapper around VistA security.

## Sections (A–H)

### 15A — Security Baseline
- Structured logger with credential/PHI redaction (`lib/logger.ts`)
- Request validation via Zod schemas (`lib/validation.ts`)
- Fastify security middleware: request IDs, security headers, rate limiting, global error handler, graceful shutdown (`middleware/security.ts`)
- Session hardening: configurable TTLs, idle timeout, session rotation (`auth/session-store.ts`)
- Auth routes: Zod validation, audit events on login/logout/failure (`auth/auth-routes.ts`)

### 15B — RPC Reliability
- Circuit breaker (closed → open after 5 failures, half-open after 30s) (`lib/rpc-resilience.ts`)
- Per-RPC timeouts (15s default, 10s connect)
- Automatic retries (max 2) with exponential backoff
- Cached RPC wrapper with configurable TTL
- Per-RPC metrics: calls, successes, failures, timeouts, avgDuration, p95

### 15C — Audit Logging (HIPAA Posture)
- Typed AuditEvent model with 40+ action types (`lib/audit.ts`)
- 4 outcome types: success, failure, denied, error
- Memory, file (JSONL), stdout sinks (configurable)
- Query and stats APIs (`/audit/events`, `/audit/stats`)
- Wired into ALL clinical endpoints:
  - PHI reads: patient-search, demographics, allergies, vitals, notes, medications, problems, patient-list
  - Clinical writes: allergy-add, vitals-add, note-create, medication-add
- ws-console migrated from local audit to centralized system
- write-backs migrated from local audit to centralized system (dual-write)

### 15D — Observability
- Request ID propagation (X-Request-Id header)
- Enhanced `/health` (uptime, version, timestamp)
- `/ready` (VistA probe)
- `/metrics` (circuit breaker stats, cache size, per-RPC metrics)
- Security headers on every response (nosniff, DENY, HSTS, no-store)

### 15E — UI Reliability
- ErrorBoundary component with retry (`components/ui/ErrorBoundary.tsx`)
- LoadingPanel with skeleton animation
- EmptyState with icon + message
- useDebounce hook for search inputs (`lib/useDebounce.ts`)
- CPRS layout + chart tab pages wrapped in ErrorBoundary

### 15F — Compliance Configuration
- Centralized config (`config/server-config.ts`)
- Session, logging, PHI, audit, RPC, cache, rate-limit settings
- All driven from constants (env-var extension possible)

### 15G — Prompts & Runbooks
- This prompt file
- Verification prompt
- Enterprise hardening runbook

### 15H — Verification & Regression
- Phase 15 verifier checks all new endpoints and features
- Phase 10–14 regression gates must still pass

## Files Touched

### New Files
| File | Purpose |
|------|---------|
| `apps/api/src/config/server-config.ts` | Centralized compliance config |
| `apps/api/src/lib/logger.ts` | Redacting structured logger |
| `apps/api/src/lib/audit.ts` | HIPAA-posture audit logging |
| `apps/api/src/lib/rpc-resilience.ts` | Circuit breaker + retries + cache + metrics |
| `apps/api/src/lib/validation.ts` | Zod request schemas |
| `apps/api/src/middleware/security.ts` | Security middleware (headers, rate limiting, error handler) |
| `apps/web/src/components/ui/ErrorBoundary.tsx` | Error boundary + loading/empty states |
| `apps/web/src/lib/useDebounce.ts` | Debounce hook |

### Modified Files
| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | Security middleware, /health, /ready, /metrics, /audit/*, /admin/*, audit wiring in all clinical endpoints |
| `apps/api/src/auth/session-store.ts` | Configurable TTLs, idle timeout, session rotation |
| `apps/api/src/auth/auth-routes.ts` | Zod validation, structured logging, audit events |
| `apps/api/src/routes/ws-console.ts` | Migrated to centralized audit system |
| `apps/api/src/routes/write-backs.ts` | Migrated to centralized audit system (dual-write) |
| `apps/web/src/app/cprs/layout.tsx` | ErrorBoundary wrapper |
| `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` | ErrorBoundary wrapper |

## Verification Steps
See `16-99-enterprise-hardening-VERIFY.md`
