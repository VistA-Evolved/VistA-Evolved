# ADR: Security Controls v1 -- Phase 75

**Status:** Accepted
**Date:** 2026-02-21
**Phase:** 75 (Go-Live Evidence Pack v1)

## Context

VistA-Evolved must demonstrate a credible security posture for investor
review, hospital IT security assessment, and operational readiness.

**This document maps technical controls to implementation evidence. It
does NOT make regulatory compliance claims. Compliance determinations
(e.g., under HIPAA) require organizational policies, training, BAAs,
and audit by qualified assessors. This ADR covers technical controls only.**

## Decision

We document the following technical security controls as implemented and
verifiable in the codebase. Each control references the specific source
file or configuration that implements it.

---

## 1. Audit Integrity

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| AI-1 | Hash-chained immutable audit | SHA-256 chain, each entry hashes predecessor | `apps/api/src/lib/immutable-audit.ts` |
| AI-2 | Imaging audit chain | Separate SHA-256 chain for imaging operations | `apps/api/src/services/imaging-audit.ts` |
| AI-3 | RCM audit chain | Separate SHA-256 chain for billing operations | `apps/api/src/rcm/audit/rcm-audit.ts` |
| AI-4 | Chain verification endpoints | Admin-only API endpoints verify chain integrity | `/iam/audit/verify`, `/imaging/audit/verify`, `/rcm/audit/verify` |
| AI-5 | PHI sanitization in audit | SSN, DOB, names stripped before hashing | `sanitizeDetail()` in each audit module |
| AI-6 | Dual persistence | Memory ring buffer + JSONL file sink | `immutable-audit.ts` (10K entries + file) |
| AI-7 | Tamper detection | Missing or altered entries break chain verification | `verifyChain()` returns first broken link |

## 2. Least Privilege

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| LP-1 | Default-deny policy engine | ~40 action mappings, no implicit grants | `apps/api/src/auth/policy-engine.ts` |
| LP-2 | Role-based access control | 7 roles with escalating privileges | `apps/api/src/auth/policies/default-policy.ts` |
| LP-3 | Module-level access guards | Routes gated by module + SKU + tenant config | `apps/api/src/middleware/module-guard.ts` |
| LP-4 | Imaging-specific RBAC | `imaging_view`, `imaging_admin` permissions separate from general admin | `apps/api/src/services/imaging-authz.ts` |
| LP-5 | Analytics permissions | Role-mapped, viewer vs admin distinction | `apps/api/src/config/analytics-config.ts` |
| LP-6 | Break-glass scoping | Emergency access is patient-scoped + time-limited (max 4h) | `imaging-authz.ts` (break-glass logic) |
| LP-7 | WebSocket RPC blocklist | `XUS AV CODE` and `XUS SET VISITOR` blocked in debug console | `apps/api/src/routes/ws-console.ts` |
| LP-8 | Service-to-service auth | Imaging ingest uses `X-Service-Key` with constant-time comparison | `apps/api/src/routes/imaging-proxy.ts` |

## 3. Session Security

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| SS-1 | httpOnly session cookies | Cookies not accessible via JavaScript | `apps/api/src/middleware/security.ts` |
| SS-2 | Idle timeout (30min) | Sessions expire after 30 minutes of inactivity | `session-store.ts` |
| SS-3 | Absolute TTL (8h) | Sessions expire regardless of activity after 8 hours | `session-store.ts` |
| SS-4 | Token rotation on login | Session ID rotated on authentication to prevent fixation | `security.ts` login handler |
| SS-5 | CSRF double-submit cookie | Cross-site request forgery protection | `security.ts` |
| SS-6 | Brute force protection | Rate limiter: 10 login attempts/min/IP + account lockout after 5 | `security.ts` |
| SS-7 | Credentials: include only | All fetch calls use `credentials: 'include'` | Enforced project-wide |
| SS-8 | No hardcoded credentials | Pre-commit scan + Phase 16 verifier cap | Secret scanner in CI |

## 4. Log Redaction & Data Protection

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| LR-1 | Structured logger only | No raw `console.log` in production code (6-cap) | Phase 16 verifier |
| LR-2 | PHI never in analytics | `AnalyticsEvent` schema structurally lacks DFN field | `analytics-store.ts` |
| LR-3 | PHI never in telemetry | OTel collector `strip-phi` processor | `services/observability/otel-collector-config.yaml` |
| LR-4 | PHI never in Prometheus | `sanitizeRoute()` replaces UUIDs/IDs with `:id` | `apps/api/src/telemetry/metrics.ts` |
| LR-5 | PHI never in telehealth URLs | Opaque hex room IDs (`ve-{randomBytes}`) | `apps/api/src/telehealth/room-store.ts` |
| LR-6 | User ID hashing in analytics | Salted SHA-256, not raw DUZ | `hashUserId()` in `analytics-store.ts` |
| LR-7 | IP hashing in production audit | IP addresses hashed in production mode | `immutable-audit.ts` |
| LR-8 | No PHI in error responses | Security middleware strips sensitive fields | `security.ts` response hooks |

## 5. SBOM & Dependency Management

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| SB-1 | CycloneDX 1.5 SBOM generation | Automated script produces component inventory | `scripts/ops/generate-sbom.ps1` |
| SB-2 | License report | `pnpm licenses list` produces dependency license audit | `generate-sbom.ps1` (step 2) |
| SB-3 | Dependency audit | `pnpm audit` in CI pipeline | Package manager built-in |
| SB-4 | Dependabot alerts | GitHub automated vulnerability scanning | Repository settings |
| SB-5 | Minimal dependency policy | RPC client, PG wire protocol, JWT validation all zero-dep | `rpcBrokerClient.ts`, `analytics-etl.ts`, `jwt-validator.ts` |

## 6. Backup & Recovery

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| BR-1 | Automated backup drill | Config + audit + VistA volume backup with manifest | `scripts/ops/backup-drill.ps1` |
| BR-2 | Automated restore drill | Manifest validation + archive extraction test | `scripts/ops/restore-drill.ps1` |
| BR-3 | Evidence-producing drill | Phase 75 drill outputs to `/artifacts/evidence/` | `scripts/ops/backup-drill-evidence.ts` |
| BR-4 | Drill reproducibility | Scripts are idempotent, can re-run any time | All drill scripts |

## 7. Performance Budgets & Observability

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| PB-1 | Budget config committed | `config/performance-budgets.json` in version control | `config/performance-budgets.json` |
| PB-2 | p95 latency thresholds | Per-endpoint p95/p99 targets defined | `config/performance-budgets.json` (apiLatencyBudgets) |
| PB-3 | k6 load tests | 3-tier smoke tests: smoke/load/stress | `tests/k6/perf-budgets.js` |
| PB-4 | Node.js perf smoke | Zero-dep portable smoke test | `scripts/ops/perf-budget-smoke.ts` |
| PB-5 | OTel tracing (opt-in) | Distributed tracing with PHI-safe spans | `apps/api/src/telemetry/tracing.ts` |
| PB-6 | Prometheus metrics | HTTP, RPC, circuit breaker metrics with sanitized labels | `apps/api/src/telemetry/metrics.ts` |
| PB-7 | Readiness probe | `/ready` returns `ok:false` when circuit breaker is open | `index.ts` |
| PB-8 | Graceful shutdown | 30s drain timeout, RPC broker disconnect | `security.ts` + `index.ts` |

## 8. Network Security

| # | Control | Evidence | Source |
|---|---------|----------|--------|
| NS-1 | Security headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options | `security.ts` |
| NS-2 | CORS enforcement | Origin allowlist, no wildcard | `security.ts` |
| NS-3 | Rate limiting | 200 req/min general, DICOMweb 120/60s | `security.ts`, `imaging-proxy.ts` |
| NS-4 | DICOMweb rate limiter | Separate per-user limiter for imaging | `imaging-proxy.ts` |

---

## Known Gaps (Explicitly Tracked)

| # | Gap | Current Mitigation | Target |
|---|-----|--------------------|--------|
| KG-1 | Sessions in-memory (not Redis) | Single-node; restart clears sessions | Multi-node deploy |
| KG-2 | No external WAF | Application-layer rate limiting + nginx | Production deploy |
| KG-3 | No HSM for key management | Env var credentials with OS ACLs | Production deploy |
| KG-4 | JSONL audit on local disk | Memory + file dual sink | Immutable blob storage |
| KG-5 | General audit lacks hash chain | Immutable audit covers security events | Future consolidation |
| KG-6 | Recording disabled in telehealth | No consent workflow implemented | Legal review required |

## Consequences

- All security controls are documented with specific source file references
- Hospital IT teams can trace each control to implementation evidence
- Known gaps are explicitly acknowledged with mitigation strategies
- No false regulatory compliance claims are made
- This ADR is versioned and can be updated as controls evolve
