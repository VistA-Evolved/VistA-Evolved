# Backup & Restore — Phase 16

> Procedures for backing up and restoring VistA-Evolved application state.

## Scope

This covers backup/restore for **application-layer** artifacts.

### What VistA-Evolved Owns

| Component         | Storage                        | Backup Method                                 |
| ----------------- | ------------------------------ | --------------------------------------------- |
| API configuration | `.env.local` / `.env.prod`     | File copy                                     |
| Audit logs        | `logs/audit.jsonl` (file sink) | File copy / log rotation                      |
| Session state     | In-memory (ephemeral)          | Not persisted — sessions recreated on restart |
| RPC cache         | In-memory (ephemeral)          | Not backed up — rebuilt on demand             |
| Web build output  | `.next/` directory             | Rebuild from source                           |

### What VistA-Evolved Does NOT Own

| Component                 | Owner              | Backup Responsibility                      |
| ------------------------- | ------------------ | ------------------------------------------ |
| **VistA/MUMPS database**  | VistA/GT.M/YottaDB | **Site-level DBA** — see constraints below |
| **Patient clinical data** | VistA              | VistA database backup                      |
| **VistA globals**         | VistA              | GT.M/YottaDB MUPIP backup                  |

## VistA Database Backup Constraints

> **Critical:** VistA-Evolved is a _presentation layer_ over VistA. All clinical
> data lives in the VistA MUMPS database. Backing up VistA-Evolved does NOT
> back up patient data.

### For WorldVistA Docker Sandbox

The Docker sandbox uses GT.M/YottaDB with filesystem-based globals:

```bash
# Stop the container to get a consistent snapshot
docker stop wv

# Backup the Docker volume
docker run --rm -v wv_data:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/vista-$(date +%Y%m%d).tar.gz /data

# Restart
docker start wv
```

### For Production VistA Instances

Production VistA backup is outside VistA-Evolved's scope. Coordinate with:

- **VistA DBA team** for MUPIP BACKUP (online/incremental)
- **Infrastructure team** for filesystem snapshots
- **Compliance team** for retention policy alignment

Reference: [VistA Technical Manual — Backup & Recovery](https://www.va.gov/vdl/) for MUPIP procedures.

## Application Backup Procedures

### 1. Configuration Backup

```bash
# Backup env files (contains credentials — encrypt in transit!)
cp apps/api/.env.local backup/env.local.$(date +%Y%m%d)
cp apps/api/.env.prod backup/env.prod.$(date +%Y%m%d) 2>/dev/null

# Backup nginx config
cp nginx/nginx.conf backup/nginx.conf.$(date +%Y%m%d)
```

### 2. Audit Log Backup

```bash
# If using file-based audit sink
cp logs/audit.jsonl backup/audit-$(date +%Y%m%d).jsonl

# Or from Docker volume
docker cp vista-evolved-api:/app/logs/audit.jsonl backup/audit-$(date +%Y%m%d).jsonl

# Rotate: truncate audit file after backup
# (only if retention policy allows and backup is verified)
```

### 3. Full Application State (Docker volumes)

```bash
# Stop services
docker compose -f docker-compose.prod.yml stop

# Backup volumes
docker run --rm \
  -v vista-evolved_api-logs:/data \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/app-state-$(date +%Y%m%d).tar.gz /data

# Restart
docker compose -f docker-compose.prod.yml start
```

## Restore Procedures

### 1. Restore Configuration

```bash
cp backup/env.local.YYYYMMDD apps/api/.env.local
cp backup/env.prod.YYYYMMDD apps/api/.env.prod
```

### 2. Restore Audit Logs

```bash
cp backup/audit-YYYYMMDD.jsonl logs/audit.jsonl
# Or mount into Docker volume
```

### 3. Full Restore (from Docker volume backup)

```bash
docker compose -f docker-compose.prod.yml down

docker run --rm \
  -v vista-evolved_api-logs:/data \
  -v $(pwd)/backup:/backup \
  alpine sh -c "cd / && tar xzf /backup/app-state-YYYYMMDD.tar.gz"

docker compose -f docker-compose.prod.yml up -d
```

## Backup Schedule Recommendation

| Item                | Frequency                       | Retention                                          |
| ------------------- | ------------------------------- | -------------------------------------------------- |
| Configuration files | Every change (versioned in Git) | Permanent (Git history)                            |
| Audit logs          | Daily                           | 365 days (configurable via `AUDIT_RETENTION_DAYS`) |
| VistA database      | Per VistA DBA policy            | Per compliance requirements                        |
| Docker images       | Per deployment                  | Keep last 5 versions                               |

## Verification

After restore, verify system health:

```bash
curl http://localhost:3001/health   # Process alive
curl http://localhost:3001/ready    # VistA reachable
curl http://localhost:3001/version  # Correct build SHA
curl http://localhost:3001/metrics  # No circuit breaker in open state
```

## Automated Drill (Phase 62)

Run the backup/restore drill scripts to exercise the full cycle:

```powershell
# Run backup drill (creates timestamped archives)
.\scripts\ops\backup-drill.ps1 -OutputDir artifacts/backups

# Run restore drill (validates the archives are extractable)
.\scripts\ops\restore-drill.ps1 -ManifestPath artifacts/backups/backup-manifest.json

# Both scripts can skip Docker with -SkipDocker
.\scripts\ops\backup-drill.ps1 -SkipDocker
```

The backup drill produces:

- `app-config-<ts>.tar.gz` -- config files
- `audit-logs-<ts>.tar.gz` -- JSONL audit trails
- `vista-globals-<ts>.tar.gz` -- Docker volume snapshot (dev only)
- `backup-manifest.json` -- machine-readable manifest

The restore drill validates:

- Manifest is readable
- Config archive is extractable with expected files
- Audit archive contains valid JSONL
- VistA archive listing contains data directory
