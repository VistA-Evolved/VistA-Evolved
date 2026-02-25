# Disaster Recovery Runbook

> Phase 134 -- VistA-Evolved DR posture for PostgreSQL-backed deployments.

## Overview

VistA-Evolved stores persistent data in PostgreSQL (primary), SQLite (dev fallback), Docker volumes (VistA, Keycloak, Orthanc), and ~30 in-memory stores (ephemeral). This runbook covers the PostgreSQL DR posture -- the primary production data plane.

## Architecture

```
Production Data Flow:
  API --> PostgreSQL (ve_platform DB)
            |-- Logical backup (pg_dump) --> ./backups/<timestamp>/
            |-- WAL archiving (PITR) --> archive volume (when configured)
            '-- Restore verification --> temp schema (dr_verify)
```

## 1. Automated Backup

### Run manually
```bash
# Requires PLATFORM_PG_URL environment variable
node scripts/dr/backup.mjs

# Custom output directory
node scripts/dr/backup.mjs --output ./backups/manual-drill

# Override PG URL
node scripts/dr/backup.mjs --pg-url postgresql://user:pass@host:5432/db
```

### Output
```
backups/<timestamp>/
  platform-pg.sql     -- pg_dump plain-text (--clean --if-exists)
  manifest.json       -- metadata, checksums, table inventory, WAL posture
```

### Manifest structure
```json
{
  "version": 1,
  "createdAt": "2026-02-26T...",
  "backupType": "pg_dump_logical",
  "pgUrl": "postgresql://***@host/db",
  "files": [{ "name": "platform-pg.sql", "sizeBytes": 12345, "sha256": "abc..." }],
  "tableInventory": { "payer": 10, "auth_session": 5, ... },
  "tableCount": 45,
  "totalRows": 150,
  "walPosture": { "wal_level": "replica", "archive_mode": "off", ... },
  "pitrReady": false
}
```

## 2. Automated Restore Verification

### Run manually
```bash
# Restore + verify from a backup directory
node scripts/dr/restore-verify.mjs --from ./backups/<timestamp>/

# Keep the temporary schema for inspection
node scripts/dr/restore-verify.mjs --from ./backups/<timestamp>/ --keep-schema
```

### What it does
1. Creates temporary `dr_verify` schema
2. Restores `platform-pg.sql` into it
3. Runs 5 phases of durability probes:
   - **Schema integrity**: table count, critical tables present
   - **Synthetic data**: write + read synthetic tenant data (no PHI)
   - **RLS verification**: row-level security enabled + FORCE RLS on
   - **Schema drift**: column count comparison production vs restored
   - **Manifest consistency**: checksum verification
4. Drops the temporary schema (unless `--keep-schema`)
5. Writes results to `artifacts/dr-restore-verify.json`

### Exit codes
| Code | Meaning |
|------|---------|
| 0 | All probes pass |
| 1 | Configuration error |
| 2 | Restore failed |
| 3 | One or more durability probes failed |

## 3. PITR Posture (WAL-based Point-in-Time Recovery)

### Current state
The Docker dev environment uses default PostgreSQL settings (`wal_level=replica` by default in PG 16, but `archive_mode=off`). Logical backups via `pg_dump` are the primary DR mechanism.

### Production requirements for PITR
```ini
# postgresql.conf additions for production PITR:
wal_level = replica                    # Already default in PG 16
archive_mode = on                      # Enable WAL archiving
archive_command = 'cp %p /archive/%f'  # Copy WAL to archive volume
max_wal_senders = 5                    # For pg_basebackup
```

### PITR restore procedure
```bash
# 1. Stop the database
pg_ctl stop -D /data

# 2. Replace data directory with base backup
rm -rf /data/*
tar xf /backups/base.tar -C /data/

# 3. Create recovery.signal and configure restore_command
echo "restore_command = 'cp /archive/%f %p'" > /data/recovery.signal

# 4. Start PostgreSQL -- it will replay WAL to the target time
pg_ctl start -D /data
```

### Monitoring WAL posture
The backup script automatically checks WAL settings and reports in `manifest.json`:
```json
"walPosture": {
  "wal_level": "replica",
  "archive_mode": "on",
  "pitrReady": true
}
```

## 4. CI/CD Integration

### Nightly DR drill
The `.github/workflows/dr-nightly.yml` workflow runs at 03:00 UTC:
1. Spins up PostgreSQL 16 service container
2. Runs PG migrations
3. Creates backup
4. Runs restore verification
5. Uploads results artifact (7-day retention)

### Manual drill
Trigger via GitHub Actions "Run workflow" button on the `dr-nightly` workflow.

### Gauntlet integration
G16 (DR Chaos Gate) runs in RC and FULL suites. It validates:
- DR scripts exist and are well-formed
- CI workflow exists
- No PHI in DR artifacts
- Backups directory is gitignored
- Runbook exists

## 5. Recovery Procedures

### Scenario: Complete database loss
```bash
# 1. Identify latest backup
ls -la backups/

# 2. Verify backup integrity
cat backups/<latest>/manifest.json | jq '.files[0].sha256'

# 3. Restore to new PG instance
export PLATFORM_PG_URL=postgresql://user:pass@new-host:5432/ve_platform
psql --dbname $PLATFORM_PG_URL < backups/<latest>/platform-pg.sql

# 4. Verify restoration
node scripts/dr/restore-verify.mjs --from backups/<latest>/
```

### Scenario: Schema drift detected
If restore-verify reports schema drift:
1. Check if pending migrations need to run
2. Compare migration versions in `_platform_migrations` table
3. Run `pg-migrate.ts` to apply missing migrations
4. Re-run backup + verify

### Scenario: RLS missing after restore
If restore-verify reports RLS failures:
1. RLS policies are created by `pg-migrate.ts` migration v7+
2. Run the API with `PLATFORM_PG_RLS_ENABLED=true` to trigger `applyRlsPolicies()`
3. Verify: `SELECT tablename, policyname FROM pg_policies WHERE policyname = 'tenant_isolation';`

## 6. Security

- **No PHI in backups/artifacts committed to git** -- `/backups/` is gitignored
- **No PHI in restore artifacts** -- synthetic tenant data only
- **Credentials redacted** in manifest (`***@` in PG URL)
- **DR scripts use `execFileSync`** -- no shell injection vectors
- **Backup retention** -- CI artifacts expire after 7 days

## 7. Monitoring Checklist

| Check | Frequency | Owner |
|-------|-----------|-------|
| Nightly DR drill passes | Daily (CI) | SRE |
| Backup size trending | Weekly | DBA |
| WAL archive growing | Daily (if PITR enabled) | DBA |
| RLS policy count stable | Per-release (G16) | Security |
| Recovery time < target | Quarterly drill | SRE |
