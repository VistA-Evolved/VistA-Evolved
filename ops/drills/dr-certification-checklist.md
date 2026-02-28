# DR Certification Checklist -- Phase 255

This checklist certifies disaster recovery readiness for VistA-Evolved.
Run `ops/drills/run-dr-certification-drill.ps1` to automate most checks.

## Pre-Drill Requirements
- [ ] PostgreSQL is running and accessible via `PLATFORM_PG_URL`
- [ ] PG migrations have been applied (all tables exist)
- [ ] `scripts/dr/backup.mjs` produces a valid manifest
- [ ] Docker is running (for volume checks)

## Backup Certification

### PG Logical Backup
- [ ] `scripts/dr/backup.mjs` produces `platform-pg.sql`
- [ ] Manifest includes SHA-256 checksums
- [ ] Manifest does NOT include credentials (redacted)
- [ ] WAL posture is reported (enabled/disabled)
- [ ] Table inventory matches expected schema

### SQLite + Audit JSONL
- [ ] `scripts/backup-restore.mjs` can backup `data/platform.db`
- [ ] Immutable audit JSONL file is backed up
- [ ] Restore requires explicit `--yes` flag

### Docker Volumes (Manual)
- [ ] VistA Docker volume backup procedure documented
- [ ] Keycloak Docker volume backup procedure documented
- [ ] Orthanc Docker volume backup procedure documented
- [ ] YottaDB/Octo Docker volume backup procedure documented

## Restore Verification

### PG Restore Probes
- [ ] Schema integrity: tables, indexes, constraints restored
- [ ] Synthetic data: write + read back succeeds
- [ ] RLS: tenant isolation enforced after restore
- [ ] Schema drift: no unexpected differences from live schema
- [ ] Checksum: restored dump matches original manifest hash

### Audit Chain Continuity
- [ ] Immutable audit hash chain verifies after restore
- [ ] No gaps in audit sequence numbers

## Recovery Metrics

### RTO (Recovery Time Objective)
| Component | Target | Measured |
|-----------|--------|----------|
| PG backup creation | < 60s | _________ |
| PG restore + verify | < 120s | _________ |
| API cold start | < 30s | _________ |
| Full service recovery | < 5 min | _________ |

### RPO (Recovery Point Objective)
| Component | Target | Notes |
|-----------|--------|-------|
| PG (logical) | Last backup interval | Nightly CI = 24h RPO |
| PG (WAL/PITR) | Near-zero (if enabled) | Requires WAL archiving |
| Audit JSONL | Last ship interval | Default 5 min if shipping enabled |
| In-memory stores | N/A (ephemeral) | 30+ stores, reconstituted on startup |

## CI/CD Integration
- [ ] `dr-nightly.yml` runs daily at 03:00 UTC
- [ ] Backup artifact uploaded (7-day retention)
- [ ] Restore verification artifact uploaded
- [ ] G16 gauntlet gate passes (static DR checks)
- [ ] G7 restart durability gate passes

## Runbook Coverage
- [ ] `docs/runbooks/disaster-recovery.md` -- primary DR procedures
- [ ] `docs/runbooks/pg-backup-pitr.md` -- WAL/PITR configuration
- [ ] `docs/runbooks/pg-backup-restore.md` -- backup scheduling
- [ ] `docs/runbooks/incident-pg-outage.md` -- SEV-2 incident response

## Production Readiness
- [ ] `docker-compose.prod.yml` has PG with healthcheck
- [ ] `STORE_BACKEND=pg` enforced in rc/prod mode
- [ ] `PLATFORM_PG_RLS_ENABLED=true` in prod compose
- [ ] Runtime mode blocks SQLite in rc/prod

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| DevOps Lead | | | |
| Security Lead | | | |
