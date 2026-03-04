# Backup & Restore Runbook

> Covers all backup targets, schedules, restore procedures, and DR validation.

## Backup Targets

| Target        | Tool           | Schedule                  | Retention                 | Script               |
| ------------- | -------------- | ------------------------- | ------------------------- | -------------------- |
| Platform PG   | `pg_dump`      | Daily 02:00               | 30d (prod), 14d (staging) | `backup-pg.ps1`      |
| YottaDB/VistA | `mupip backup` | Daily 03:00               | 30d (prod)                | `backup-yottadb.ps1` |
| Audit JSONL   | File copy      | Shipped via audit-shipper | 365d (S3)                 | `backup-restore.mjs` |
| SQLite (dev)  | File copy      | On-demand                 | N/A                       | `backup-restore.mjs` |
| Keycloak PG   | `pg_dump`      | Daily 04:00               | 30d                       | Docker volume        |
| Orthanc DICOM | Docker volume  | Daily 05:00               | 30d                       | Docker volume        |

## Quick Commands

### Backup

```powershell
# PostgreSQL
.\infra\scripts\backup-pg.ps1

# YottaDB
.\infra\scripts\backup-yottadb.ps1

# Unified (PG + SQLite + Audit JSONL)
node scripts/backup-restore.mjs backup --target all

# Evidence pack (includes backup state)
.\infra\scripts\generate-evidence-pack.ps1
```

### Restore

```powershell
# PostgreSQL restore
node scripts/backup-restore.mjs restore --target pg --yes

# SQLite restore
node scripts/backup-restore.mjs restore --target sqlite --yes

# Full restore (ALL targets)
node scripts/backup-restore.mjs restore --target all --yes
```

**WARNING:** Restore requires `--yes` flag to prevent accidental overwrite.

## Restore Procedure (Full DR)

### Step 1: Stop Services

```powershell
# Stop API
# (Ctrl+C or kill the process)

# Stop downstream consumers
docker compose -f services/vista/docker-compose.yml down
```

### Step 2: Restore Database

```powershell
# PG restore from latest backup
node scripts/backup-restore.mjs restore --target pg --yes

# Verify
psql $PLATFORM_PG_URL -c "SELECT count(*) FROM tenants;"
```

### Step 3: Restore VistA

```powershell
# YottaDB restore
.\infra\scripts\backup-yottadb.ps1 -Restore

# Restart VistA container
docker compose -f services/vista/docker-compose.yml up -d

# Wait for VistA ready (port 9430, ~15s)
Start-Sleep -Seconds 20
```

### Step 4: Restart API

```powershell
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

### Step 5: Verify Recovery

```powershell
# Health check
curl http://127.0.0.1:3001/health

# VistA connectivity
curl http://127.0.0.1:3001/vista/ping

# Default patient list
curl http://127.0.0.1:3001/vista/default-patient-list
```

## DR Drill

Run regularly (nightly in CI, weekly manual):

```powershell
# Full DR drill (PG + YottaDB)
.\infra\scripts\dr-drill.ps1 -Scope full

# PG only
.\infra\scripts\dr-drill.ps1 -Scope pg-only

# Check DR posture
.\infra\scripts\dr-posture-check.ps1
```

DR drill artifacts are written to `artifacts/dr-drill/` (gitignored).

## RPO / RTO Targets

| Environment | RPO | RTO   |
| ----------- | --- | ----- |
| Dev         | N/A | N/A   |
| Staging     | 24h | 1h    |
| Prod        | 4h  | 30min |

## In-Memory Store Recovery

~30 in-memory stores reset on API restart. These are by design:

- Session store (users re-login)
- RPC capability cache (auto-rebuilds)
- Imaging worklist (re-fetches from VistA)
- Telehealth rooms (auto-expire)
- RCM pipeline (re-initialized)
- Analytics aggregation (re-runs from DB)

See `apps/api/src/platform/store-policy.ts` for the full inventory.
