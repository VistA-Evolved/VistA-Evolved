# ADR: DR / Backup Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs a disaster recovery and backup strategy for production.
Current state:

- **backup-restore.mjs** (285 lines): Unified backup/restore for SQLite + PG +
  audit JSONL. Uses `execFileSync` (no shell injection). Restore requires `--yes`.
- **dr/backup.mjs**: Docker volume backup for VistA, Keycloak, Orthanc, YottaDB
- **dr/restore-verify.mjs**: Restore verification with integrity checks
- **Graphile Worker**: PG backup via cron job (scheduled `pg_dump`)
- **backup-posture.ts**: 6 posture gates for backup health monitoring
- **immutable-audit.ts**: SHA-256 hash-chained JSONL audit trail with file sink
- **audit-shipping (Phase 157)**: S3/MinIO audit archive with manifest verification

**What is missing:**

- No Velero for K8s-native backup/restore
- No automated WAL-based Point-In-Time Recovery (PITR)
- Docker volume backups are manual (documented in runbook)
- No cross-region replication
- In-memory stores (~30) lose data on restart (by design)

## Decision

**Keep the existing pg_dump + script-based backup approach. Add Velero
manifests for K8s-layer backup when cluster is operational. Add WAL archiving
configuration for PG PITR.**

Rationale:

- Current `pg_dump` approach works and is tested
- Velero adds K8s-native namespace/PV backup but requires a running cluster
- WAL archiving enables PITR without changing the backup scripts
- Audit shipping to S3 (Phase 157) already handles immutable audit DR
- In-memory stores are intentionally ephemeral — not a backup gap

## Alternatives Considered

| Option                          | License    | Pros                             | Cons                                     |
| ------------------------------- | ---------- | -------------------------------- | ---------------------------------------- |
| **Velero**                      | Apache-2.0 | K8s-native, PV snapshots         | Requires cluster + cloud provider plugin |
| **pgBackRest**                  | MIT        | Parallel backup, PITR, S3 native | New service to deploy and configure      |
| **Barman**                      | GPL-3.0    | Full PG backup management        | GPL, heavy for our needs                 |
| **pg_dump + scripts (current)** | N/A        | Simple, works, tested            | No PITR, no incremental                  |
| **pg_dump + WAL + Velero**      | N/A        | Layered coverage                 | Multiple tools to configure              |

## Consequences

**Positive:**

- No new infrastructure immediately
- WAL archiving is a PG configuration change (not a new service)
- Velero manifests can be prepared now, deployed when cluster ready
- Audit shipping already provides immutable audit DR
- backup-posture.ts continues to monitor backup health

**Negative:**

- pg_dump is full-backup only (no incremental)
- WAL archiving requires S3 or local storage for WAL files
- Velero restore is cluster-scoped — can't restore individual tables
- Docker volume backups remain manual for dev environment

**Migration path:**

1. Phase 238: Decision locked (this ADR)
2. Phase 246 (P9): Add `archive_command` to PG config for WAL archiving
3. Phase 246 (P9): Add Velero CRDs + schedule manifests to Helm charts
4. Production: Enable WAL archiving, deploy Velero, test restore runbook

## Security / PHI Notes

- Database backups contain PHI — must be encrypted at rest
- S3 bucket for WAL archives must have server-side encryption (SSE-S3 or SSE-KMS)
- Velero backup artifacts must be in encrypted, access-controlled storage
- Restore operations must be audit-logged (immutable-audit.ts)
- backup-restore.mjs `--yes` flag prevents accidental restore

## Ops Notes

- RPO target: 1 hour (pg_dump cron) or 5 minutes (WAL archiving)
- RTO target: 30 minutes (PG restore) + 15 minutes (K8s redeploy)
- Monitor: `/posture/backup` returns 6-gate backup health
- Test: Run `node scripts/backup-restore.mjs backup` + `restore --yes` monthly
- VistA backup: Docker volume snapshot (manual, documented in runbook)
