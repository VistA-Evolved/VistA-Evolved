# Phase 95: Payer Registry Persistence + Audit — Runbook

## Overview

Phase 95 converts the PH payer registry from read-only JSON + in-memory Map
into a durable, audited, evidence-backed persistence layer. Zero new
dependencies — uses JSON files on disk with in-memory cache, following the
project's established patterns.

## Architecture

```
data/payers/
  ph-hmo-registry.json       ← Phase 93 seed (27 HMOs, read-only)
  registry-db.json            ← Phase 95 persistent store (28 payers)
  tenant-overrides.json       ← Phase 95 tenant-scoped overrides

logs/
  payer-audit.jsonl           ← Append-only hash-chained audit trail

apps/api/src/rcm/payers/
  payer-persistence.ts        ← Core durable store (CRUD + import + tenant overrides)
  payer-audit.ts              ← Hash-chained audit trail (SHA-256)
  evidence-manager.ts         ← Evidence validation + hashing + coverage scoring
  payer-admin-routes.ts       ← Admin REST endpoints (13 routes)
  ph-hmo-registry.ts          ← Phase 93 read-only registry (unchanged, backward-compat)
  ph-hmo-routes.ts            ← Phase 93 routes (unchanged)
  ph-hmo-adapter.ts           ← Phase 93 adapters (unchanged)
```

## Prerequisites

- API server running on localhost:3001
- `data/payers/ph-hmo-registry.json` present (Phase 93)

## Import Steps

### Option 1: CLI Script

```powershell
.\scripts\import-payer-registry.ps1
```

### Option 2: API Call

```bash
curl -X POST http://localhost:3001/admin/payers/import \
  -H "Content-Type: application/json" \
  -d '{"actor":"admin","sourceType":"insurance_commission_snapshot"}'
```

### Option 3: Admin UI

Navigate to `/cprs/admin/payer-registry` → click "Import from Snapshot"

## API Endpoints

| Method | Path                                  | Description                                  |
| ------ | ------------------------------------- | -------------------------------------------- |
| GET    | `/admin/payers`                       | List all payers (filterable, paginated)      |
| GET    | `/admin/payers/stats`                 | Registry stats + evidence scores             |
| GET    | `/admin/payers/:id`                   | Single payer detail with evidence validation |
| POST   | `/admin/payers/import`                | Import from snapshot JSON                    |
| PATCH  | `/admin/payers/:id/capabilities`      | Update payer capabilities                    |
| PATCH  | `/admin/payers/:id/tasks`             | Update contracting tasks                     |
| PATCH  | `/admin/payers/:id/status`            | Update payer status                          |
| POST   | `/admin/payers/:id/evidence`          | Add evidence item                            |
| GET    | `/admin/payers/:id/evidence/validate` | Evidence validation report                   |
| GET    | `/admin/payers/:id/audit`             | Payer audit trail                            |
| GET    | `/admin/payers/audit/verify`          | Verify audit chain integrity                 |
| POST   | `/admin/payers/:id/tenant-override`   | Set tenant override                          |
| GET    | `/admin/payers/:id/tenant-override`   | Get tenant override                          |

## Key Behaviors

1. **Import is idempotent** — re-running import skips existing records
2. **PhilHealth is the 28th payer** — auto-added during import
3. **Atomic writes** — uses tmp file + rename for crash safety
4. **BOM handling** — strips UTF-8 BOM from PowerShell-generated JSON (BUG-064)
5. **Audit is hash-chained** — SHA-256 chain, verifiable via `/admin/payers/audit/verify`
6. **Evidence coverage scoring** — each payer gets 0-100% evidence coverage

## Troubleshooting

| Symptom                         | Cause                                  | Fix                                            |
| ------------------------------- | -------------------------------------- | ---------------------------------------------- |
| "No payers in persistent store" | Registry not imported yet              | Run import script or POST /admin/payers/import |
| "Snapshot not found"            | ph-hmo-registry.json missing           | Verify data/payers/ph-hmo-registry.json exists |
| Stale data after import         | Import is idempotent, won't overwrite  | Delete registry-db.json and re-import          |
| Audit chain broken              | In-memory ring buffer reset on restart | Expected behavior; file audit trail persists   |

## Verification

```powershell
# 1. Check API compiles
cd apps/api; npx tsc --noEmit

# 2. Import registry
.\scripts\import-payer-registry.ps1

# 3. Verify count
curl http://localhost:3001/admin/payers/stats
# Should show total: 28, hasPhilHealth: true

# 4. Verify audit chain
curl http://localhost:3001/admin/payers/audit/verify
# Should show ok: true
```
