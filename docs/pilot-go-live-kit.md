# Pilot Hospital Go-Live Kit -- Phase 256

This is the unified go-live readiness document for VistA-Evolved pilot
deployments. It aggregates all verification, certification, and operational
gates from Wave 7 (Phases 248-255) into a single actionable checklist.

## Table of Contents

1. [Pre-Deployment Requirements](#1-pre-deployment-requirements)
2. [Infrastructure Readiness](#2-infrastructure-readiness)
3. [VistA Integration](#3-vista-integration)
4. [Security Certification](#4-security-certification)
5. [Data Layer](#5-data-layer)
6. [Verification Gates Summary](#6-verification-gates-summary)
7. [Operational Runbooks](#7-operational-runbooks)
8. [Day-1 Checklist](#8-day-1-checklist)
9. [Rollback Plan](#9-rollback-plan)
10. [Sign-Off](#10-sign-off)

---

## 1. Pre-Deployment Requirements

### Environment Variables

All production env vars documented in `apps/api/.env.example`:

| Variable                  | Required    | Description                   |
| ------------------------- | ----------- | ----------------------------- |
| `PLATFORM_RUNTIME_MODE`   | Yes         | Must be `rc` or `prod`        |
| `PLATFORM_PG_URL`         | Yes         | PostgreSQL connection string  |
| `PLATFORM_PG_RLS_ENABLED` | Yes         | Must be `true`                |
| `STORE_BACKEND`           | Yes         | Must be `pg`                  |
| `VISTA_HOST`              | Yes         | VistA hostname                |
| `VISTA_PORT`              | Yes         | VistA TCP port (default 9430) |
| `VISTA_ACCESS_CODE`       | Yes         | RPC broker access code        |
| `VISTA_VERIFY_CODE`       | Yes         | RPC broker verify code        |
| `OIDC_ENABLED`            | rc/prod     | Must be `true` in rc/prod     |
| `OIDC_ISSUER`             | rc/prod     | Keycloak issuer URL           |
| `OIDC_CLIENT_ID`          | rc/prod     | OIDC client identifier        |
| `NODE_ENV`                | Recommended | `production`                  |
| `OTEL_ENABLED`            | Recommended | `true` for observability      |
| `AUDIT_SHIP_ENABLED`      | Recommended | `true` for audit compliance   |

### Docker Services

Production compose: `docker-compose.prod.yml`

```bash
# Core services (always required)
docker compose -f docker-compose.prod.yml up -d

# Optional imaging profile
docker compose -f docker-compose.prod.yml --profile imaging up -d
```

### PostgreSQL

- PostgreSQL 16+ required
- All migrations applied (`pg-migrate.ts`)
- RLS enabled on all tenant tables
- `bi_readonly` user for analytics (if ROcto enabled)

---

## 2. Infrastructure Readiness

### Health Endpoints

| Endpoint       | Purpose      | Expected                           |
| -------------- | ------------ | ---------------------------------- |
| `GET /health`  | Liveness     | Always `ok: true`                  |
| `GET /ready`   | Readiness    | `ok: true` when VistA + CB healthy |
| `GET /version` | Version info | Returns build metadata             |

### Posture Endpoints (Admin Only)

| Endpoint                     | Domain                    | Target Score          |
| ---------------------------- | ------------------------- | --------------------- |
| `GET /posture`               | Aggregate                 | >= 90% for production |
| `GET /posture/observability` | Logging, metrics, tracing | 100%                  |
| `GET /posture/performance`   | Rate limit, CB, SLO       | >= 80%                |
| `GET /posture/tenant`        | RLS, tenant isolation     | 100%                  |
| `GET /posture/backup`        | Backup readiness          | >= 80%                |
| `GET /posture/data-plane`    | PG, OIDC, auth mode       | 100% for prod         |
| `GET /posture/certification` | Docs, infra completeness  | >= 90%                |

### Circuit Breaker

- Threshold: 5 failures (configurable via `RPC_CB_THRESHOLD`)
- Reset: 30s (configurable via `RPC_CB_RESET_MS`)
- `/ready` returns `ok: false` when CB is open

### Graceful Shutdown

- Drain timeout: 30s (configurable via `SHUTDOWN_DRAIN_TIMEOUT_MS`)
- SIGTERM handler disconnects RPC broker, flushes OTel, closes PG pool
- Force exit after drain timeout

---

## 3. VistA Integration

### RPC Provisioning

Run the unified installer after VistA container is up:

```powershell
.\scripts\install-vista-routines.ps1
# Or with scheduling seed data:
.\scripts\install-vista-routines.ps1 -Seed
```

Verify provisioning:

```
GET /vista/provision/status   (admin-only)
```

Expected: `health: "fully-provisioned"` or `"partially-provisioned"`

### RPC Registry

- 137 registered RPCs + 59 known exceptions
- Contract fixtures for 10 critical RPCs in `apps/api/tests/fixtures/vista/`
- All `callRpc`/`safeCallRpc` call sites verified against registry (Phase 106)

### Connection Parameters

- VistA socket health: 5-min idle timeout, TCP keepalive (30s probe)
- Auto-reconnect on stale socket
- Async mutex serializes all RPC calls

---

## 4. Security Certification

### Authentication

- VistA RPC auth for dev mode
- OIDC (Keycloak) mandatory for rc/prod mode
- Session tokens: SHA-256 hashed in PG
- CSRF: session-bound synchronizer token (not double-submit cookie)

### Authorization

- Policy engine: default-deny with ~40 action mappings
- RBAC: admin, provider, nurse, pharmacist, clerk roles
- Module-scoped permissions (imaging_view, analytics_viewer, etc.)
- Break-glass: patient-scoped, time-limited, audit-logged

### Rate Limiting

- Global rate limiter on all routes
- Separate DICOMweb rate limiter (120 req/60s default)
- Rate limit returns 429 with retry-after

### Audit

- Immutable hash-chained audit trail (SHA-256)
- PHI sanitized before hashing via `sanitizeAuditDetail()`
- Dual sink: in-memory ring buffer + JSONL file
- Optional S3 shipping for compliance

---

## 5. Data Layer

### PostgreSQL (Required for rc/prod)

- 20+ migration versions applied
- RLS on all tenant tables (ENABLE + FORCE)
- Transaction-scoped tenant context (`SET LOCAL`)
- SQLite blocked in rc/prod mode

### In-Memory Stores

- 30+ stores documented in `store-policy.ts`
- All classified as `in_memory`, `pg_backed`, or `pg_migrating`
- Loss on restart is by design for ephemeral stores
- PG-backed stores survive restart

### Backup

- PG logical backup: `scripts/dr/backup.mjs`
- Restore verification: `scripts/dr/restore-verify.mjs`
- Nightly CI drill: `.github/workflows/dr-nightly.yml`
- Legacy backup: `scripts/backup-restore.mjs` (SQLite + JSONL + PG)

---

## 6. Verification Gates Summary

### Wave 7 Gate Results

| Phase     | Name                     | Gates   | Verifier                                         |
| --------- | ------------------------ | ------- | ------------------------------------------------ |
| 248       | Wave 7 Manifest          | 26      | `scripts/wave7-entry-gate.ps1`                   |
| 249       | Supply Chain Security    | 21      | `scripts/verify-phase249-supply-chain.ps1`       |
| 250       | RPC Contract Harness     | 20      | `scripts/verify-phase250-rpc-contracts.ps1`      |
| 251       | API + FHIR Contracts     | 18      | `scripts/verify-phase251-api-fhir-contracts.ps1` |
| 252       | E2E Clinical Journeys    | 19      | `scripts/verify-phase252-e2e-journeys.ps1`       |
| 253       | Performance Acceptance   | 17      | `scripts/verify-phase253-perf-gates.ps1`         |
| 254       | Resilience Certification | 27      | `scripts/verify-phase254-resilience.ps1`         |
| 255       | DR Certification Drill   | 27      | `scripts/verify-phase255-dr-certification.ps1`   |
| **256**   | **Go-Live Kit**          | **22**  | `scripts/verify-phase256-go-live-kit.ps1`        |
| **Total** |                          | **197** |                                                  |

### Gauntlet Suite

Run the full gauntlet for RC/production readiness:

```powershell
node qa/gauntlet/cli.mjs RC    # Release candidate suite
node qa/gauntlet/cli.mjs FULL  # Full production suite
```

### CI Workflows

| Workflow                       | Schedule           | Purpose                           |
| ------------------------------ | ------------------ | --------------------------------- |
| `supply-chain-security.yml`    | Push + monthly     | SBOM, Trivy, Grype, license check |
| `dr-nightly.yml`               | Daily 03:00 UTC    | PG backup/restore cycle           |
| `resilience-certification.yml` | Push + nightly     | Resilience pattern validation     |
| `perf-acceptance-gate.yml`     | Dispatch + nightly | k6 smoke + load tests             |

---

## 7. Operational Runbooks

### Core Runbooks

| Runbook            | Path                                                 |
| ------------------ | ---------------------------------------------------- |
| Disaster Recovery  | `docs/runbooks/disaster-recovery.md`                 |
| PG Backup PITR     | `docs/runbooks/pg-backup-pitr.md`                    |
| PG Outage Incident | `docs/runbooks/incident-pg-outage.md`                |
| VistA Provisioning | `docs/runbooks/vista-provisioning.md`                |
| VistA Distro Lane  | `docs/runbooks/vista-distro-lane.md`                 |
| Production Posture | `docs/runbooks/phase107-production-posture.md`       |
| Observability      | `docs/runbooks/phase36-observability-reliability.md` |

### Domain Runbooks

| Runbook                | Path                                           |
| ---------------------- | ---------------------------------------------- |
| Imaging Security       | `docs/runbooks/imaging-enterprise-security.md` |
| RCM Payer Connectivity | `docs/runbooks/rcm-payer-connectivity.md`      |
| Telehealth             | `docs/runbooks/phase30-telehealth.md`          |
| IAM/AuthZ/Audit        | `docs/runbooks/phase35-iam-authz-audit.md`     |
| Analytics              | `docs/runbooks/analytics-octo-rocto.md`        |

---

## 8. Day-1 Checklist

### T-7 Days (One Week Before Go-Live)

- [ ] All Wave 7 verifiers pass (197 gates)
- [ ] Gauntlet RC suite passes
- [ ] Site configured in pilot site-config (status: `preflight`)
- [ ] Preflight checks run (target score >= 80)
- [ ] Keycloak realm configured with site-specific users
- [ ] VistA routines installed and verified
- [ ] DR drill completed successfully
- [ ] Backup schedule confirmed (nightly at minimum)

### T-1 Day (Day Before Go-Live)

- [ ] Final preflight check (target score >= 90)
- [ ] All posture endpoints green
- [ ] OTel tracing confirmed working
- [ ] Audit JSONL shipping confirmed (if configured)
- [ ] Rate limiter thresholds tuned for expected load
- [ ] Emergency contacts verified
- [ ] Rollback plan reviewed by team

### T-0 (Go-Live Day)

- [ ] Site status changed to `go-live`
- [ ] Health and ready endpoints confirmed green
- [ ] First user login successful
- [ ] First patient lookup successful
- [ ] Audit trail capturing events
- [ ] Monitoring dashboards active
- [ ] On-call engineer confirmed available

### T+1 Day (Day After Go-Live)

- [ ] Review overnight audit logs
- [ ] Verify no circuit breaker trips
- [ ] Verify backup ran successfully
- [ ] Check error rates in Prometheus/Jaeger
- [ ] Site status changed to `active`

---

## 9. Rollback Plan

### Immediate Rollback (< 5 min)

1. Stop the API: `docker compose -f docker-compose.prod.yml stop api`
2. Display maintenance page via nginx proxy
3. Notify users

### Data Rollback (< 30 min)

1. Stop all services: `docker compose -f docker-compose.prod.yml down`
2. Restore PG from last backup: `node scripts/dr/restore-verify.mjs --from <backup-dir>`
3. Verify restore: check probe results
4. Restart services: `docker compose -f docker-compose.prod.yml up -d`

### Full Rollback (< 1 hr)

1. Revert to previous Docker image tags
2. Restore PG from known-good backup
3. Run migrations if schema changed
4. Verify all health/ready endpoints

---

## 10. Sign-Off

| Role             | Name | Date | Signature |
| ---------------- | ---- | ---- | --------- |
| Engineering Lead |      |      |           |
| DevOps Lead      |      |      |           |
| Security Lead    |      |      |           |
| Clinical Lead    |      |      |           |
| Site Contact     |      |      |           |

### Certification Statement

> All verification gates pass. Resilience drills complete.
> DR pipeline tested. Security posture validated.
> This deployment is certified for pilot go-live.
