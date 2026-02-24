# PG Backup & Restore Runbook — Phase 118

## Overview

VistA-Evolved uses PostgreSQL (via `PLATFORM_PG_URL`) for durable session,
workqueue, and job queue storage. Backups are automated via a Graphile Worker
cron task (`pg_backup`) that runs `pg_dump` daily.

## Automated Backup

### How It Works

1. **Graphile Worker** runs the `pg_backup` task on a cron schedule (default: `0 1 * * *` = daily at 1 AM)
2. `pg_dump` exports the full database as plain SQL
3. Output is written to `artifacts/backups/pg/ve-platform-{timestamp}.sql`
4. Old backups beyond the retention count (default: 7) are automatically pruned

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `PG_BACKUP_DIR` | `artifacts/backups/pg` | Directory for backup files |
| `PG_BACKUP_RETAIN_COUNT` | `7` | Max backups to keep |
| `JOB_CRON_PG_BACKUP` | `0 1 * * *` | Cron schedule (Graphile format) |
| `JOB_CRON_PG_BACKUP` | `disabled` | Set to disable automatic backups |

### Prerequisites

- `pg_dump` must be available in `$PATH` (included in PostgreSQL client tools)
- `PLATFORM_PG_URL` must be set
- Job worker must be enabled: `JOB_WORKER_ENABLED=true`

## Manual Backup

```bash
# Using the backup-restore script
node scripts/backup-restore.mjs backup

# Direct pg_dump
pg_dump --format=plain --no-owner --clean --if-exists "$PLATFORM_PG_URL" > backup.sql

# Compressed
pg_dump --format=custom "$PLATFORM_PG_URL" > backup.dump
```

## Restore

### From Automated Backup

```bash
# List available backups
ls artifacts/backups/pg/

# Restore from a specific backup
psql "$PLATFORM_PG_URL" < artifacts/backups/pg/ve-platform-2026-02-24T01-00-00-000Z.sql
```

### From Manual Backup

```bash
# Plain SQL
psql "$PLATFORM_PG_URL" < backup.sql

# Custom format (allows selective restore)
pg_restore --clean --if-exists -d "$PLATFORM_PG_URL" backup.dump
```

### Using backup-restore.mjs

```bash
node scripts/backup-restore.mjs restore --yes
```

**CAUTION**: Restore overwrites all data. The `--yes` flag is required.

## Verification

```bash
# Check backup status via API
curl -s http://localhost:3001/hardening/backup-status | python -m json.tool

# Verify backup file is valid SQL
head -20 artifacts/backups/pg/ve-platform-*.sql  # Should show pg_dump header

# Count tables in backup
grep "CREATE TABLE" artifacts/backups/pg/ve-platform-*.sql | wc -l
```

## Monitoring

| Check | How |
|-------|-----|
| Last backup age | `GET /hardening/backup-status` → `lastBackup.timestamp` |
| Backup count | `GET /hardening/backup-status` → `backupCount` |
| Job failures | `GET /rcm/workqueues/stats` or check `graphile_worker._private_jobs` |

## Disaster Recovery

1. **Fresh PG instance**: Start a new PostgreSQL container
2. **Restore latest backup**: `psql "$NEW_PG_URL" < latest-backup.sql`
3. **Update `PLATFORM_PG_URL`**: Point to the new instance
4. **Restart API**: Migrations will apply any missing changes
5. **Verify**: `curl http://localhost:3001/health` should show `platformPg.ok: true`

## Docker Volume Backup

For the raw PostgreSQL data volume:

```bash
# Stop the container first
docker compose -f services/platform-db/docker-compose.yml stop

# Backup the volume
docker run --rm -v ve_pgdata:/data -v $(pwd)/artifacts/backups:/backup \
  alpine tar czf /backup/pgdata-$(date +%Y%m%d).tar.gz -C /data .

# Restart
docker compose -f services/platform-db/docker-compose.yml start
```

## PITR (Point-in-Time Recovery)

For production deployments requiring PITR:
1. Enable WAL archiving in `postgresql.conf`
2. Set `archive_mode = on`
3. Configure `archive_command` to copy WAL files to backup storage
4. See `docs/runbooks/pg-backup-pitr.md` for detailed PITR setup
