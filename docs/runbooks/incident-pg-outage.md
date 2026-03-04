# Incident Runbook: PostgreSQL Outage

## Severity: SEV-2 (session persistence + job queue affected; clinical reads still work via VistA)

## Symptoms

- `/health` shows `platformPg.ok: false`
- New login sessions not persisting across API restarts
- Job queue (`graphile_worker`) not processing
- Workqueue items not updating
- API logs show PG connection errors

## Triage (first 5 minutes)

### 1. Check PG Docker container

```bash
docker ps --filter "name=ve-platform-db"
docker exec ve-platform-db pg_isready -U ve_api -d ve_platform
```

### 2. Check API health for PG status

```bash
curl -s http://localhost:3001/health | python -m json.tool
# Look at platformPg.ok and platformPg.latencyMs
```

### 3. Check PG logs

```bash
docker logs --tail 50 ve-platform-db 2>&1
```

### 4. Check connection pool

```bash
# Check active connections
docker exec ve-platform-db psql -U ve_api -d ve_platform \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

## Common Causes & Fixes

### Container stopped

- **Fix**: Restart the container
  ```bash
  docker compose -f services/platform-db/docker-compose.yml up -d
  # Wait for health check
  docker exec ve-platform-db pg_isready -U ve_api -d ve_platform
  ```

### Disk space exhaustion

- **Symptom**: PG logs show `No space left on device`
- **Fix**:
  ```bash
  # Check Docker volume usage
  docker system df -v
  # Prune unused images/volumes
  docker system prune -f
  # Or expand disk
  ```

### Connection pool exhaustion

- **Symptom**: `too many connections for role "ve_api"`
- **Fix**:
  ```bash
  # Kill idle connections
  docker exec ve-platform-db psql -U ve_api -d ve_platform \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND age(clock_timestamp(), state_change) > interval '10 minutes';"
  ```
- **Prevention**: Tune `max_connections` in `postgresql.conf`
- **Default pool size**: 10 (via Drizzle/node-postgres)

### Migration failure

- **Symptom**: API startup fails with migration error
- **Fix**: Check which migration failed
  ```bash
  docker exec ve-platform-db psql -U ve_api -d ve_platform \
    -c "SELECT * FROM platform_migrations ORDER BY version DESC LIMIT 5;"
  ```
- **Manual fix**: Apply migration manually or rollback
  ```sql
  -- Delete failed migration record to retry
  DELETE FROM platform_migrations WHERE version = 9 AND success = false;
  ```
  Then restart API.

### Data corruption

- **Symptom**: Queries return unexpected errors
- **Fix**: Restore from backup

  ```bash
  # Find latest backup
  ls -la artifacts/backups/pg/

  # Restore
  psql "$PLATFORM_PG_URL" < artifacts/backups/pg/ve-platform-latest.sql
  ```

- **See**: `docs/runbooks/pg-backup-restore.md`

## Degraded Mode Behavior

When PG is down but SQLite is available:

- API continues to function (SQLite fallback for STORE_BACKEND=auto)
- If `STORE_BACKEND=pg`, API startup will warn but sessions fall back to SQLite
- Job queue stops processing (Graphile Worker requires PG)
- Workqueue items tracked in-memory only
- RLS enforcement not available

When PG is completely unavailable and `STORE_BACKEND=pg`:

- `resolveBackend("pg")` throws if `PLATFORM_PG_URL` missing
- New sessions may not persist across restarts

## Recovery Verification

```bash
# PG health
docker exec ve-platform-db pg_isready -U ve_api -d ve_platform

# API health shows PG ok
curl -s http://localhost:3001/health | python -m json.tool

# Sessions persist
curl -s -c cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' \
  http://localhost:3001/auth/login

# Check session in PG
docker exec ve-platform-db psql -U ve_api -d ve_platform \
  -c "SELECT id, user_duz, created_at FROM auth_session ORDER BY created_at DESC LIMIT 3;"
```

## Post-Incident

- Run backup verification: `GET /hardening/backup-status`
- Check Graphile Worker queue: `SELECT count(*) FROM graphile_worker._private_jobs WHERE last_error IS NOT NULL;`
- Document root cause in BUG-TRACKER.md
