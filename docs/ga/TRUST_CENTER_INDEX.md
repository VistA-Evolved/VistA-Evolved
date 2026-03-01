# VistA-Evolved Trust Center Index

> External-facing documentation index for compliance, security, and operational
> transparency. All content is PHI-safe and designed for sharing with auditors,
> compliance teams, and enterprise procurement reviewers.

---

## Security & Compliance

| Document | Path | Description |
|----------|------|-------------|
| Security Posture | [docs/trust-center/SECURITY_POSTURE.md](../trust-center/SECURITY_POSTURE.md) | Defense-in-depth architecture, RBAC/ABAC, encryption |
| Architecture Overview | [docs/trust-center/ARCHITECTURE_OVERVIEW.md](../trust-center/ARCHITECTURE_OVERVIEW.md) | System architecture and component map |
| Trust Center | [docs/trust-center/TRUST_CENTER.md](../trust-center/TRUST_CENTER.md) | Master trust center document |
| PHI Handling (RCM) | [docs/security/rcm-phi-handling.md](../security/rcm-phi-handling.md) | HIPAA-aligned PHI safeguards for revenue cycle |

## GA Readiness

| Document | Path | Description |
|----------|------|-------------|
| GA Readiness Checklist | [docs/ga/GA_READINESS_CHECKLIST.md](GA_READINESS_CHECKLIST.md) | 19-gate readiness verification |
| GA Certification Runner | [scripts/verify-ga.ps1](../../scripts/verify-ga.ps1) | Automated 6-section evidence collector |
| GA Checklist Script | [scripts/ga-checklist.ps1](../../scripts/ga-checklist.ps1) | 19-gate PASS/FAIL verifier |

## Architecture Decisions

| ADR | Path | Description |
|-----|------|-------------|
| GA Readiness Model | [docs/decisions/ADR-GA-READINESS-MODEL.md](../decisions/ADR-GA-READINESS-MODEL.md) | Gate-based readiness framework |
| Release Train | [docs/decisions/ADR-RELEASE-TRAIN-GOVERNANCE.md](../decisions/ADR-RELEASE-TRAIN-GOVERNANCE.md) | Release lifecycle governance |
| Data Rights | [docs/decisions/ADR-DATA-RIGHTS-OPERATIONS.md](../decisions/ADR-DATA-RIGHTS-OPERATIONS.md) | GDPR/HIPAA data lifecycle |
| Product Modularity | [docs/architecture/product-modularity-v1.md](../architecture/product-modularity-v1.md) | SKU + adapter architecture |
| RCM Gateway | [docs/architecture/rcm-gateway-architecture.md](../architecture/rcm-gateway-architecture.md) | Revenue cycle gateway spec |

## Wave 20 Evidence Gates

| Gate | Description | Evidence |
|------|-------------|----------|
| G01 | TLS Termination | infra/tls/Caddyfile |
| G02 | DR Restore Validation | scripts/backup-restore.mjs |
| G03 | Performance Budgets | config/performance-budgets.json |
| G04 | Security Certification | scripts/verify-wave16-security.ps1 |
| G05 | Interop Certification | scripts/verify-wave18-ecosystem.ps1 |
| G06 | Department Packs | scripts/verify-wave17-packs.ps1 |
| G07 | Scale Certification | scripts/verify-wave19-analytics.ps1 |
| G08 | Audit Trail Integrity | apps/api/src/lib/immutable-audit.ts |
| G09 | PHI Redaction | apps/api/src/lib/phi-redaction.ts |
| G10 | Policy Engine | apps/api/src/auth/policy-engine.ts |
| G11 | Module Guard | apps/api/src/middleware/module-guard.ts |
| G12 | Data Plane Posture | apps/api/src/posture/data-plane-posture.ts |
| G13 | RCM Audit Trail | apps/api/src/rcm/audit/rcm-audit.ts |
| G14 | Observability | apps/api/src/telemetry/tracing.ts + metrics.ts |
| G15 | OIDC / IAM | apps/api/src/auth/oidc-provider.ts |
| G16 | Release Train | apps/api/src/services/release-train-service.ts |
| G17 | Support Ops | apps/api/src/services/support-ops-service.ts |
| G18 | Data Rights | apps/api/src/services/data-rights-service.ts |
| G19 | Trust Center | docs/trust-center/TRUST_CENTER.md |

## API Endpoints (Wave 20)

| Route Prefix | Auth | Phase | Description |
|-------------|------|-------|-------------|
| /release-train/ | admin | 371 | Release train governance |
| /customer-success/ | admin | 372 | Customer success tooling |
| /support-ops/ | admin | 373 | Support ops automation |
| /external-validation/ | admin | 374 | External validation harness |
| /data-rights/ | admin | 375 | Data rights operations |
| /ga/evidence/ | admin | 377 | GA evidence + trust center |
