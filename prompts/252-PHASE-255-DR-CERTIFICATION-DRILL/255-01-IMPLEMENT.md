# Phase 255 -- DR Certification Drill (Wave 7 P8)

## Objective

Certify disaster recovery readiness by hardening existing DR infrastructure
and providing drill scripts, a certification checklist, and evidence-grade
verification of backup/restore pipelines.

## Implementation Steps

### 1. DR Drill Script (`ops/drills/run-dr-certification-drill.ps1`)

- Validates backup infrastructure exists and is well-structured
- Checks backup script integrity (pg_dump, SHA-256, manifest, credential redaction)
- Checks restore-verify probes (schema, synthetic, RLS, drift, checksum)
- Validates runbook coverage
- Validates gauntlet G16 gate
- Checks store-policy awareness of in-memory stores
- Validates production compose PG configuration
- Writes timestamped certification artifact to artifacts/

### 2. DR Certification Checklist (`ops/drills/dr-certification-checklist.md`)

- Pre-drill requirements
- Backup certification (PG, SQLite, audit JSONL, Docker volumes)
- Restore verification (5 probe types)
- RTO/RPO measurement tables
- CI/CD integration checks
- Runbook coverage
- Production readiness
- Sign-off table for engineering/devops/security leads

### 3. Static DR Certification Vitest Suite

- `apps/api/tests/dr-certification.test.ts` -- 9 describe blocks
  - Backup Scripts, Restore Verification, CI/CD Integration,
    Runbooks, Gauntlet Gate, Production Compose, Store Policy,
    DR Drill Infrastructure
- Validates structure without requiring live services

### 4. Verification Script

- `scripts/verify-phase255-dr-certification.ps1` -- 30 gates

## Files Created

- `ops/drills/run-dr-certification-drill.ps1`
- `ops/drills/dr-certification-checklist.md`
- `apps/api/tests/dr-certification.test.ts`
- `scripts/verify-phase255-dr-certification.ps1`

## Files Inspected (Inventory-First)

- `scripts/dr/backup.mjs` -- PG logical backup with SHA-256 + manifest
- `scripts/dr/restore-verify.mjs` -- 5-phase restore probes
- `scripts/backup-restore.mjs` -- legacy backup/restore (SQLite + JSONL + PG)
- `.github/workflows/dr-nightly.yml` -- nightly CI backup/restore cycle
- `qa/gauntlet/gates/g16-restart-chaos-gate.mjs` -- static DR gate
- `docker-compose.prod.yml` -- production services
- `apps/api/src/platform/store-policy.ts` -- in-memory store inventory
- `docs/runbooks/disaster-recovery.md` -- primary DR procedures
- `docs/runbooks/pg-backup-pitr.md` -- WAL/PITR configuration
- `docs/runbooks/incident-pg-outage.md` -- PG outage incident response

## Existing Patterns Reused

- PowerShell Gate() verifier pattern
- Vitest describe/it/expect pattern
- ops/drills/ directory for operational drill scripts
