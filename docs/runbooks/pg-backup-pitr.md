# PostgreSQL Backup & PITR — Production Runbook

> Phase 117 — Postgres-first prod posture

---

## 1. Architecture Overview

VistA-Evolved production uses **PostgreSQL 16** as the durable store for:

- **Auth sessions** (`auth_session`) — cookie-based session tokens
- **RCM workqueue items** (`rcm_work_item`, `rcm_work_item_event`) — rejection/denial/missing-info queues
- **Payer domain data** — payer DB, capability matrix, connector state, audit
- **Module entitlements** — module catalog, tenant modules, feature flags
- **Platform stores** — idempotency, portal messaging, portal appointments, telehealth rooms, imaging worklist/ingest

SQLite remains the local dev default (`STORE_BACKEND=auto` without `PLATFORM_PG_URL`).

---

## 2. WAL Configuration (PITR Prerequisite)

The `docker-compose.prod.yml` configures PG with WAL archiving support:

```yaml
command: >
  postgres
    -c wal_level=replica
    -c archive_mode=on
    -c archive_command='cp %p /var/lib/postgresql/wal_archive/%f'
    -c max_wal_senders=3
```

**Production steps:**

1. Create WAL archive volume:

   ```bash
   docker exec ve-platform-db-prod mkdir -p /var/lib/postgresql/wal_archive
   ```

2. Verify WAL level:

   ```sql
   SHOW wal_level;          -- must be 'replica'
   SHOW archive_mode;       -- must be 'on'
   SHOW archive_command;    -- must be non-empty
   ```

3. For S3/GCS archiving, replace the `archive_command` with:
   ```
   archive_command = 'aws s3 cp %p s3://your-bucket/wal/%f'
   ```
   Or use [pgBackRest](https://pgbackrest.org/) / [wal-g](https://github.com/wal-g/wal-g).

---

## 3. Base Backup

### 3a. pg_basebackup (simplest)

```bash
# From the host:
docker exec ve-platform-db-prod \
  pg_basebackup -D /tmp/backup -Ft -z -Xs -P -U postgres

# Copy out:
docker cp ve-platform-db-prod:/tmp/backup ./backups/pg-base-$(date +%Y%m%d)
```

### 3b. Logical backup (pg_dump)

```bash
docker exec ve-platform-db-prod \
  pg_dump -U postgres -d vista_evolved -Fc -f /tmp/ve_dump.custom

docker cp ve-platform-db-prod:/tmp/ve_dump.custom \
  ./backups/ve_dump_$(date +%Y%m%d).custom
```

### 3c. Automated daily schedule

Add to crontab or Windows Task Scheduler:

```bash
# Linux cron (daily 2 AM)
0 2 * * * /opt/ve/scripts/backup-pg.sh >> /var/log/ve-backup.log 2>&1
```

---

## 4. Point-in-Time Recovery (PITR)

### 4a. When to use

- Accidental data deletion
- Schema migration gone wrong
- Recovery to specific timestamp

### 4b. Steps

1. **Stop the API** (both instances):

   ```bash
   docker compose -f docker-compose.prod.yml stop api
   ```

2. **Stop PG**:

   ```bash
   docker compose -f docker-compose.prod.yml stop platform-db
   ```

3. **Restore base backup** over the pgdata volume:

   ```bash
   # Remove current data
   docker volume rm vistaevolved_pgdata
   docker volume create vistaevolved_pgdata

   # Restore base backup
   docker run --rm -v vistaevolved_pgdata:/var/lib/postgresql/data \
     -v $(pwd)/backups/pg-base-20250101:/backup \
     alpine sh -c "cd /var/lib/postgresql/data && tar xzf /backup/base.tar.gz"
   ```

4. **Create recovery config** (`recovery.signal` + `postgresql.conf`):

   ```bash
   docker run --rm -v vistaevolved_pgdata:/var/lib/postgresql/data alpine sh -c "
     touch /var/lib/postgresql/data/recovery.signal
     echo \"restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'\" >> /var/lib/postgresql/data/postgresql.conf
     echo \"recovery_target_time = '2025-01-15 14:30:00 UTC'\" >> /var/lib/postgresql/data/postgresql.conf
   "
   ```

5. **Start PG** — it replays WAL up to the target time:

   ```bash
   docker compose -f docker-compose.prod.yml up platform-db -d
   docker logs -f ve-platform-db-prod  # Watch for "recovery complete"
   ```

6. **Promote** (if needed):

   ```bash
   docker exec ve-platform-db-prod pg_ctl promote -D /var/lib/postgresql/data
   ```

7. **Start API**:
   ```bash
   docker compose -f docker-compose.prod.yml up api -d --scale api=2
   ```

---

## 5. Restore Drill (Monthly)

Run this drill monthly to verify backup integrity:

### Drill checklist

| #   | Step                                             | Verify                                                       |
| --- | ------------------------------------------------ | ------------------------------------------------------------ |
| 1   | Take fresh pg_dump                               | File size > 0                                                |
| 2   | Spin up isolated PG container                    | Container healthy                                            |
| 3   | Restore dump into isolated PG                    | `pg_restore` exits 0                                         |
| 4   | Point one API instance at restored PG            | API starts, /health → 200                                    |
| 5   | Run `scripts/test-multi-instance.mjs` against it | All gates pass                                               |
| 6   | Verify RLS is enforced                           | `SELECT * FROM auth_session` returns only tenant-scoped rows |
| 7   | Tear down isolated PG                            | Clean exit                                                   |

### Drill script

```powershell
# 1. Dump
docker exec ve-platform-db-prod pg_dump -U postgres -d vista_evolved -Fc -f /tmp/drill.custom

# 2. Isolated PG
docker run -d --name ve-drill-pg -e POSTGRES_PASSWORD=drill -e POSTGRES_DB=vista_evolved -p 5499:5432 postgres:16-alpine
Start-Sleep -Seconds 10

# 3. Restore
docker cp ve-platform-db-prod:/tmp/drill.custom ./drill.custom
docker cp ./drill.custom ve-drill-pg:/tmp/drill.custom
docker exec ve-drill-pg pg_restore -U postgres -d vista_evolved -c /tmp/drill.custom

# 4. Start API against drill PG
$env:PLATFORM_PG_URL = "postgresql://postgres:drill@127.0.0.1:5499/vista_evolved"
$env:STORE_BACKEND = "pg"
# Start API and test...

# 5. Cleanup
docker stop ve-drill-pg; docker rm ve-drill-pg
Remove-Item ./drill.custom
```

---

## 6. Migration Management

### Current migrations (pg-migrate.ts)

| Version | Name                             | Tables                                                 |
| ------- | -------------------------------- | ------------------------------------------------------ |
| v1      | payer_db                         | payers, payer_edi_config                               |
| v2      | capability_matrix                | payer_capability, payer_override, payer_audit_event    |
| v3      | accreditation                    | payer_accreditation                                    |
| v4      | connector_state                  | connector_state, connector_event, connector_alert      |
| v5      | performance_indexes              | 15+ indexes                                            |
| v6      | security_rls                     | RLS enablement for 22 tables                           |
| v7      | job_run_log                      | job_run_log table                                      |
| v8      | (reserved)                       |                                                        |
| v9      | session_workqueue_multi_instance | auth_session, rcm_work_item, rcm_work_item_event + RLS |

### Adding a new migration

1. Increment version in `pg-migrate.ts`
2. Add `{ version: N, name: "description", up: async (sql) => { ... } }`
3. Test: `PLATFORM_PG_URL=... npx tsx apps/api/src/index.ts` — migrations auto-run
4. Verify: `SELECT * FROM _ve_migrations ORDER BY version`

### Rollback

There is no automatic rollback. To revert:

1. Write a new migration that undoes the changes
2. Or restore from backup (Section 4)

---

## 7. Multi-Instance Considerations

### Session sharing

With `STORE_BACKEND=pg`, sessions are stored in PostgreSQL. Both API instances
read/write the same `auth_session` table. A session created on instance A is
immediately visible to instance B.

### Workqueue sharing

Workqueue items in `rcm_work_item` are shared across instances. Any instance
can create, read, or update items. The `locked_by` / `lock_expires_at` columns
support cross-instance locking (for future concurrent dequeue).

### Scaling

```bash
docker compose -f docker-compose.prod.yml up -d --scale api=2
```

nginx round-robins between instances. All durable state is in PG.

### Health checks

- `/health` — always 200 (liveness)
- `/ready` — returns `ok: false` if circuit breaker is open (readiness)

---

## 8. Environment Variables

| Variable                  | Default | Description                                            |
| ------------------------- | ------- | ------------------------------------------------------ |
| `STORE_BACKEND`           | `auto`  | `auto` (PG if URL set), `pg` (force), `sqlite` (force) |
| `PLATFORM_PG_URL`         | —       | PostgreSQL connection string                           |
| `PLATFORM_PG_RLS_ENABLED` | `false` | Enable Row-Level Security                              |
| `JOB_WORKER_ENABLED`      | `false` | Start embedded Graphile Worker                         |

---

## 9. Monitoring

### Key queries

```sql
-- Active sessions
SELECT COUNT(*) FROM auth_session WHERE revoked_at IS NULL AND expires_at > NOW();

-- Open workqueue items by type
SELECT type, COUNT(*) FROM rcm_work_item WHERE status = 'open' GROUP BY type;

-- Migration status
SELECT version, name, applied_at FROM _ve_migrations ORDER BY version;

-- Database size
SELECT pg_size_pretty(pg_database_size('vista_evolved'));

-- WAL lag (for replicas)
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS bytes_lag
FROM pg_stat_replication;
```

### Alerts to configure

- WAL archive falling behind (archive_command failures)
- Replication lag > 1 MB
- Connection count approaching `max_connections`
- Database size growth rate
- Failed backup (exit code != 0)
