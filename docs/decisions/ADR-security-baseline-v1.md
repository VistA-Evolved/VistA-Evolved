# ADR: Security Baseline v1 -- Phase 62

**Status:** Accepted
**Date:** 2026-02-21
**Phase:** 62 (Go-Live Hardening Pack v1)

## Context

VistA-Evolved must demonstrate a credible security posture for hospital
security review. This ADR maps HIPAA Administrative, Physical, and Technical
Safeguards to the controls implemented in the system.

## Decision

We adopt the following security baseline as the minimum standard for
go-live readiness. Each control maps to a HIPAA safeguard reference.

---

## Control Matrix

### Authentication & Access Control

| #    | Control                        | Implementation                                                | HIPAA Reference    |
| ---- | ------------------------------ | ------------------------------------------------------------- | ------------------ |
| AC-1 | Unique user identification     | VistA DUZ + session token per user                            | 164.312(a)(2)(i)   |
| AC-2 | Emergency access (break-glass) | Break-glass with time-limited patient-scoped grants           | 164.312(a)(2)(ii)  |
| AC-3 | Automatic logoff               | 30m idle timeout, 8h absolute TTL                             | 164.312(a)(2)(iii) |
| AC-4 | Session encryption             | httpOnly cookies, Secure flag in production                   | 164.312(a)(2)(iv)  |
| AC-5 | Role-based access control      | 7 roles, policy engine (40 actions), default-deny             | 164.312(a)(1)      |
| AC-6 | CSRF protection                | Double-submit cookie pattern                                  | CWE-352            |
| AC-7 | Brute force protection         | Rate limiter (10 login/min/IP) + account lockout (5 attempts) | CWE-307            |
| AC-8 | Session fixation prevention    | Token rotation on login (Phase 15)                            | CWE-384            |
| AC-9 | OIDC (opt-in)                  | JWT validation, JWKS caching, RS/ES256-512                    | 164.312(d)         |

### Audit Controls

| #    | Control                 | Implementation                                                    | HIPAA Reference |
| ---- | ----------------------- | ----------------------------------------------------------------- | --------------- |
| AU-1 | Audit trail             | 5 audit subsystems, 60+ event types                               | 164.312(b)      |
| AU-2 | Tamper evidence         | SHA-256 hash chains on 3/5 audit stores                           | 164.312(b)      |
| AU-3 | Audit verification      | `/iam/audit/verify`, `/imaging/audit/verify`, `/rcm/audit/verify` | 164.312(b)      |
| AU-4 | PHI sanitization        | SSN/DOB/name stripped from audit entries                          | 164.312(b)      |
| AU-5 | Dual persistence        | Memory + JSONL file for immutable audit                           | 164.312(b)      |
| AU-6 | File chain verification | `verifyFileAuditChain()` for JSONL files                          | 164.312(b)      |

### Network & Transport

| #    | Control          | Implementation                                      | HIPAA Reference |
| ---- | ---------------- | --------------------------------------------------- | --------------- |
| NT-1 | TLS termination  | nginx proxy with TLS placeholder                    | 164.312(e)(1)   |
| NT-2 | Security headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options  | CWE-various     |
| NT-3 | CORS enforcement | Origin allowlist in security.ts                     | CWE-942         |
| NT-4 | Rate limiting    | 200 req/min general, 10 login/min, DICOMweb 120/60s | 164.312(a)(1)   |

### Data Protection

| #    | Control                      | Implementation                                         | HIPAA Reference |
| ---- | ---------------------------- | ------------------------------------------------------ | --------------- |
| DP-1 | PHI never in analytics       | AnalyticsEvent schema structurally lacks DFN           | 164.502(a)      |
| DP-2 | PHI never in telemetry       | OTel collector strip-phi processor                     | 164.502(a)      |
| DP-3 | PHI never in logs            | Structured logger, no clinical data in log fields      | 164.502(a)      |
| DP-4 | PHI never in URLs            | Query params sanitized in Prometheus labels            | 164.502(a)      |
| DP-5 | PHI never in telehealth URLs | Opaque room IDs, no patient names                      | 164.502(a)      |
| DP-6 | Response scrubbing           | security.ts strips sensitive fields from API responses | 164.502(a)      |

### Operational Security

| #    | Control             | Implementation                                | HIPAA Reference      |
| ---- | ------------------- | --------------------------------------------- | -------------------- |
| OP-1 | Backup procedures   | Automated drill scripts (Phase 62)            | 164.308(a)(7)(ii)(A) |
| OP-2 | Restore validation  | Restore drill with manifest verification      | 164.308(a)(7)(ii)(A) |
| OP-3 | Incident response   | 3-scenario runbook with SEV-1 to SEV-4 levels | 164.308(a)(6)        |
| OP-4 | SBOM generation     | CycloneDX 1.5 for dependency tracking         | EO-14028             |
| OP-5 | Secret scanning     | CI gate, pre-commit hook                      | CWE-798              |
| OP-6 | Dependency auditing | pnpm audit in CI                              | CWE-1395             |
| OP-7 | Graceful shutdown   | 30s drain timeout, RPC broker disconnect      | N/A                  |

### Multi-Tenancy

| #    | Control               | Implementation                                     | HIPAA Reference |
| ---- | --------------------- | -------------------------------------------------- | --------------- |
| MT-1 | Tenant identification | TenantConfig store, session.tenantId               | 164.312(a)(1)   |
| MT-2 | Tenant middleware     | Request-level tenant context resolution (Phase 62) | 164.312(a)(1)   |
| MT-3 | Cache isolation       | Tenant-prefixed cache keys (Phase 62)              | 164.312(a)(1)   |
| MT-4 | Capability scoping    | resolveCapabilities(tenantId) per-tenant           | 164.312(a)(1)   |

---

## Known Gaps (accept-and-mitigate)

| Gap                                     | Mitigation                                                       | Target            |
| --------------------------------------- | ---------------------------------------------------------------- | ----------------- |
| Sessions in-memory (not Redis)          | API restart clears sessions (acceptable for single-node)         | Phase 65+         |
| General + portal audit lack hash chains | Immutable audit covers security events; general is informational | Phase 65+         |
| No external WAF                         | nginx rate limiting + application-layer controls                 | Production deploy |
| No HSM for key management               | Env var credentials with OS-level ACLs                           | Production deploy |
| JSONL audit on local disk               | Immutable blob storage for production                            | Production deploy |

## Consequences

- All go-live hardening controls are documented and verifiable
- Security review teams can map HIPAA safeguards to specific code/config
- Known gaps are explicitly tracked with mitigation strategies
- Phase 62 verifier validates the presence of all critical controls
