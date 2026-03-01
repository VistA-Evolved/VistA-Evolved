# VistA-Evolved Security Posture

> Technical security controls summary for security assessments.
> Phase 316 (Wave 13)

## Authentication Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| Multi-factor auth | OIDC + WebAuthn passkeys | auth/oidc-provider.ts, auth/biometric/passkeys-provider.ts |
| Session management | httpOnly cookies, SHA-256 token hashing, DB-backed sessions | platform/pg/pg-migrate.ts |
| CSRF protection | Session-bound synchronizer token (X-CSRF-Token header) | middleware/idempotency.ts |
| Credential isolation | .env.local (gitignored), no hardcoded creds outside login | BUG-035 |
| Auto-logoff | Session TTL + socket idle timeout (5 min) | rpcBrokerClient.ts |

## Authorization Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| Default-deny policy | policy-engine.ts (~40 actions) | Phase 35 |
| Role-based access | 7 Keycloak roles mapped to permissions | infra/keycloak/realm-export.json |
| Module guard | SKU-based route enforcement | middleware/module-guard.ts |
| Imaging RBAC | Permission-based + break-glass | services/imaging-authz.ts |
| Admin route protection | requireRole(session, 'admin') | security.ts |

## Data Protection Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| PHI redaction | sanitizeAuditDetail() — SSN, DOB, names, DFN stripped | lib/phi-redaction.ts |
| Analytics no-PHI | Events structurally lack DFN; user IDs hashed | services/analytics-store.ts |
| Telemetry PHI strip | OTel Collector strips bodies, statements, patient.* | otel-collector-config.yaml |
| Audit integrity | SHA-256 hash chains (3 trails) | lib/immutable-audit.ts |
| Cookie security | Secure flag in rc/prod; httpOnly; SameSite | auth-routes.ts |

## Network Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| Rate limiting | General + DICOMweb-specific limiters | security.ts, imaging-proxy.ts |
| Circuit breaker | 5-fail open, 30s half-open, 2 retries | rpc-resilience.ts |
| WebSocket RPC block | XUS AV CODE + XUS SET VISITOR blocked | ws-console.ts |
| Service-to-service auth | X-Service-Key with constant-time comparison | imaging ingest |
| Readiness probe | /ready returns false when circuit breaker open | index.ts |

## Operational Controls

| Control | Implementation | Evidence |
|---------|---------------|----------|
| Structured logging | AsyncLocalStorage for request ID propagation | logger |
| Audit shipping | S3/MinIO with SHA-256 manifests | audit-shipping/shipper.ts |
| Backup | SQLite + PG + audit JSONL backup script | scripts/backup-restore.mjs |
| Graceful shutdown | 30s drain, broker disconnect, job cleanup | security.ts |
| Runtime mode enforcement | rc/prod blocks SQLite, requires PG + OIDC | platform/runtime-mode.ts |

## Vulnerability Management

| Area | Approach |
|------|----------|
| Dependencies | Zero external DB/HTTP drivers; minimal dependency surface |
| Input validation | Fastify schema validation; RPC parameter sanitization |
| SQL injection | Parameterized queries in PG wire protocol client |
| XSS | React (auto-escape) + CSP headers |
| SSRF | Orthanc/OHIF behind API proxy, no direct external access in prod |
