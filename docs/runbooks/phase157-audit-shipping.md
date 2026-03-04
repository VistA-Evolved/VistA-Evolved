# Phase 157: Audit JSONL Shipping to Object Store

## Overview

The audit shipper periodically uploads immutable audit JSONL entries to
S3-compatible object storage (MinIO locally, AWS S3 in production).
Each upload includes a SHA-256 integrity manifest for tamper evidence.

## Architecture

```
immutable-audit.ts  -->  logs/immutable-audit.jsonl
                               |
                       [shipper.ts reads new lines]
                               |
                     +------- group by tenantId ------+
                     |                                |
              upload chunk A                   upload chunk B
              upload manifest A                upload manifest B
                     |                                |
              update offset A                  update offset B
                     |                                |
                     +---- Postgres / SQLite ---------+
```

## Object Key Format

```
audit/{tenantId}/YYYY/MM/DD/{timestamp}_{firstSeq}-{lastSeq}.jsonl
audit/{tenantId}/YYYY/MM/DD/{timestamp}_{firstSeq}-{lastSeq}.manifest.json
```

## Configuration

| Env Var                  | Default                 | Description           |
| ------------------------ | ----------------------- | --------------------- |
| `AUDIT_SHIP_ENABLED`     | `false`                 | Enable the shipper    |
| `AUDIT_SHIP_ENDPOINT`    | `http://localhost:9000` | S3/MinIO endpoint     |
| `AUDIT_SHIP_BUCKET`      | `vista-evolved-audit`   | S3 bucket name        |
| `AUDIT_SHIP_ACCESS_KEY`  | (none)                  | AWS/MinIO access key  |
| `AUDIT_SHIP_SECRET_KEY`  | (none)                  | AWS/MinIO secret key  |
| `AUDIT_SHIP_REGION`      | `us-east-1`             | AWS region            |
| `AUDIT_SHIP_INTERVAL_MS` | `300000`                | Ship interval (5 min) |
| `AUDIT_SHIP_CHUNK_SIZE`  | `1000`                  | Max lines per upload  |
| `AUDIT_SHIP_PATH_STYLE`  | `true`                  | Path-style for MinIO  |

## Local MinIO Setup

```bash
# Start MinIO container
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Create bucket
docker exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec minio mc mb local/vista-evolved-audit
```

Then set in `.env.local`:

```env
AUDIT_SHIP_ENABLED=true
AUDIT_SHIP_ENDPOINT=http://localhost:9000
AUDIT_SHIP_ACCESS_KEY=minioadmin
AUDIT_SHIP_SECRET_KEY=minioadmin
```

## API Endpoints

All require admin auth (matched by `/audit/*` catch-all in AUTH_RULES).

| Method | Path                        | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/audit/shipping/status`    | Shipping health overview |
| POST   | `/audit/shipping/trigger`   | Manual ship cycle        |
| GET    | `/audit/shipping/manifests` | List recent manifests    |
| GET    | `/audit/shipping/health`    | S3 connectivity check    |

## Posture Gate

The `/posture/audit-shipping` endpoint checks 6 gates:

1. `audit_ship_enabled` - AUDIT_SHIP_ENABLED=true
2. `s3_credentials_configured` - Access key + secret key set
3. `shipper_job_running` - Periodic job is active
4. `s3_bucket_reachable` - HEAD bucket succeeds
5. `manifests_exist` - At least one manifest created
6. `audit_file_exists` - JSONL file has entries

## Manifest Format

```json
{
  "id": "uuid",
  "tenantId": "default",
  "objectKey": "audit/default/2026/02/27/20260227T120000Z_1-100.jsonl",
  "contentHash": "sha256...",
  "entryCount": 100,
  "firstSeq": 1,
  "lastSeq": 100,
  "lastEntryHash": "sha256...",
  "byteSize": 45678,
  "createdAt": "2026-02-27T12:00:00.000Z"
}
```

## Security Notes

- No PHI: Audit entries are already PHI-redacted by `immutable-audit.ts`
- Tenant-aware: Object keys are partitioned by `tenantId`
- Idempotent: Offset tracking prevents duplicate uploads
- Retryable: Failed uploads are retried on the next cycle
- Credentials: Never logged or included in audit entries
- Integrity: SHA-256 manifests verify chunk content

## Troubleshooting

1. **Shipper not running**: Check `AUDIT_SHIP_ENABLED=true` in env
2. **S3 unreachable**: Test with `curl http://localhost:9000/minio/health/live`
3. **No entries shipped**: Check `logs/immutable-audit.jsonl` exists and has content
4. **Permission denied**: Verify S3 credentials and bucket policy
5. **Duplicate uploads**: Check `/audit/shipping/manifests` for overlapping seq ranges
