# Phase 115 -- Durability Wave 2: Portal/Telehealth/Imaging/Idempotency

## Overview

Phase 115 replaces 6 in-memory `Map<>` stores with DB-backed durable
persistence using the lazy-wiring pattern from Phase 114.

## Stores Migrated

| Store | File | Table | Repo |
|-------|------|-------|------|
| Portal Messages | `services/portal-messaging.ts` | `portal_message` | `portal-message-repo.ts` |
| Portal Appointments | `services/portal-appointments.ts` | `portal_appointment` | `portal-appointment-repo.ts` |
| Telehealth Rooms | `telehealth/room-store.ts` | `telehealth_room` | `telehealth-room-repo.ts` |
| Imaging Worklist | `services/imaging-worklist.ts` | `imaging_work_order` | `imaging-worklist-repo.ts` |
| Imaging Ingest | `services/imaging-ingest.ts` | `imaging_study_link` + `imaging_unmatched` | `imaging-ingest-repo.ts` |
| Idempotency Keys | `middleware/idempotency.ts` | `idempotency_key` | `idempotency-repo.ts` |

## Architecture Pattern

Each store uses the Phase 114 lazy-wiring pattern:

1. **Repo slot**: `let _repo: RepoType | null = null`
2. **Init function**: `export function initXxxRepo(repo): void`
3. **In-memory cache**: `Map<>` retained as hot-path cache
4. **DB-first writes**: All mutations write to DB, then update cache
5. **Cache-miss reads**: Check cache first, fall back to DB on miss
6. **Graceful fallback**: If `_repo` is null, operates cache-only

## Tables Added (7 total)

- `portal_message` (AI) -- messages, threads, attachments (JSON)
- `portal_appointment` (AJ) -- appointments, scheduling
- `telehealth_room` (AK) -- room lifecycle, participants (JSON)
- `imaging_work_order` (AL) -- radiology orders, accession numbers
- `imaging_study_link` (AM) -- DICOM study-to-order linkages
- `imaging_unmatched` (AN) -- quarantined unreconciled studies
- `idempotency_key` (AO) -- request deduplication with TTL

## PHI Handling

- Portal messages store `fromDfn`/`toDfn` references only
- Patient names stored only for worklist display (denormalized)
- Telehealth rooms use opaque room IDs, no PHI in DB
- Idempotency stores response bodies which may contain clinical data;
  24-hour TTL auto-expires entries

## Verification

```powershell
.\scripts\verify-phase115-durability-wave2.ps1
```

## Manual Testing

```powershell
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Check logs for "wired to DB" messages for all 6 stores
# Create test data via portal/imaging endpoints
# Restart API -- data should survive restart
```
