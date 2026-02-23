# Runbook: Platform Persistence (Phase 95B)

## Overview

Phase 95B introduces SQLite-backed persistence for the payer registry using
Drizzle ORM + better-sqlite3. This replaces/supplements the JSON-file
persistence from Phase 95.

## Database Location

- Default: `data/platform.db` (relative to repo root)
- Override: `PLATFORM_DB_PATH` environment variable
- WAL mode enabled for concurrent reads

## Startup

The platform DB initializes automatically on server startup:

1. `initPlatformDb()` is called in `index.ts` after `server.listen()`
2. Runs idempotent migrations (`CREATE TABLE IF NOT EXISTS`)
3. Seeds from `data/payers/*.json` if payer table is empty
4. Logs result: `Platform DB init { ok, migrated, seeded }`

## Tables

| Table | Purpose |
|-------|---------|
| `payer` | Canonical payer records |
| `tenant_payer` | Per-tenant payer overrides |
| `payer_capability` | Payer capability matrix |
| `payer_task` | Payer onboarding tasks |
| `payer_evidence_snapshot` | Evidence ingest history |
| `payer_audit_event` | Append-only audit trail |

## Admin UI

Navigate to: **Admin Console > Payer DB**

Four tabs:
- **Payers**: Search, browse, click to view capabilities
- **Capabilities**: View/edit capability matrix per payer (reason required)
- **Evidence**: Ingest JSON snapshots, review diffs, promote
- **Audit**: Full audit timeline with stats

## API Endpoints

All under `/admin/payer-db/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/payers` | List/search payers |
| GET | `/payers/:id` | Get payer by ID |
| POST | `/payers` | Create payer |
| PUT | `/payers/:id` | Update payer |
| GET | `/payers/:id/capabilities` | List capabilities |
| PUT | `/payers/:id/capabilities` | Set capability (reason required) |
| GET | `/payers/:id/tasks` | List tasks |
| POST | `/payers/:id/tasks` | Create task |
| PUT | `/payers/:id/tasks/:taskId` | Update task status |
| GET | `/payers/:id/audit` | Payer audit trail |
| GET | `/evidence` | List evidence snapshots |
| POST | `/evidence/ingest-json` | Ingest JSON snapshot |
| POST | `/evidence/:id/promote` | Promote snapshot |
| GET | `/tenant/:tenantId/payers` | Tenant payer overrides |
| POST | `/tenant/:tenantId/payers` | Upsert tenant payer config |
| GET | `/audit` | Global audit trail |
| GET | `/audit/stats` | Audit statistics |

## Evidence Pipeline

### Ingest JSON Snapshot

```bash
curl -X POST http://localhost:3001/admin/payer-db/evidence/ingest-json \
  -H 'Content-Type: application/json' \
  -d '{"filePath":"data/payers/ph_hmos.json","asOfDate":"2025-01-20"}'
```

Returns: `{ ok, snapshotId, payerCount, sha256 }`

### Promote Snapshot

```bash
curl -X POST http://localhost:3001/admin/payer-db/evidence/SNAPSHOT_ID/promote \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Returns: `{ ok, inserted, updated, skipped, failures }`

## Troubleshooting

### Database locked
SQLite WAL mode handles concurrent reads, but only one writer at a time.
If you see "database is locked", check for long-running transactions.

### Seed not running
Seed only runs if payer table is empty. To re-seed, delete `data/platform.db`
and restart the server.

### BOM in JSON files
PowerShell `Set-Content -Encoding UTF8` adds a BOM. The seed function strips
it automatically (BUG-064).

### Native module build failure
`better-sqlite3` requires node-gyp. Ensure you have:
- Python 3.x
- Visual Studio Build Tools (Windows)
- Run `pnpm install` from repo root
