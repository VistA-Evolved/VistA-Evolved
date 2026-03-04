# Phase 127 -- IMPLEMENT: Portal + Telehealth Durability (Postgres Repos + Restart Gate)

## User Request

Remove portal/telehealth "local_only Map stores" by persisting durable state
in Postgres. Same Phase 126 pattern: PG schema + async repos + write-through
from in-memory cache stores + restart-durability gate update.

## Hard Requirements

- No PHI in test fixtures
- Portal messaging stays durable before MailMan bridge
- Tenant-aware + RLS compatible
- Write-through pattern (cache-first reads, PG writes fire-and-forget)

## Target Tables (PG migration v11)

| #   | PG Table               | Source Store                    | SQLite Predecessor |
| --- | ---------------------- | ------------------------------- | ------------------ |
| 1   | portal_message         | portal-messaging.ts             | Yes (Phase 115)    |
| 2   | portal_access_log      | access-log-store.ts             | Yes (Phase 121)    |
| 3   | portal_patient_setting | portal-settings.ts              | No (new)           |
| 4   | telehealth_room        | room-store.ts                   | Yes (Phase 115)    |
| 5   | telehealth_room_event  | room-store.ts (event sub-table) | No (new)           |

## Implementation Steps

1. **PG Schema** -- Add 5 pgTable definitions to pg-schema.ts (tenant_id on each)
2. **PG Migration v11** -- DDL for 5 CREATE TABLE + indexes in pg-migrate.ts
3. **RLS** -- Add 5 new tables to applyRlsPolicies() tenant list
4. **PG Repos** -- Create 5 async repo files in platform/pg/repo/
5. **PG Barrel** -- Add 5 exports to platform/pg/repo/index.ts
6. **Store Interfaces** -- Loosen MsgRepo, RoomRepo, AccessLogRepo to `any` returns
7. **portal-settings.ts** -- Add SettingsRepo interface + initSettingsRepo() + write-through
8. **index.ts** -- Add 5 PG re-wire try/catch blocks in "if (backend === pg)" section
9. **Restart-Durability Gate** -- Add Phase 127 checks to restart-durability.mjs
10. **TypeCheck + Gauntlet** -- Verify clean build + all gates pass

## Verification Steps

- `npx tsc -p apps/api/tsconfig.json --noEmit` -- clean
- `node scripts/qa-gates/restart-durability.mjs` -- all gates pass
- `node qa/gauntlet/cli.mjs --suite fast` -- all gates pass

## Files Touched

- prompts/131-PHASE-127-PORTAL-TELEHEALTH-PG/127-01-IMPLEMENT.md (this file)
- apps/api/src/platform/pg/pg-schema.ts (5 new pgTable defs)
- apps/api/src/platform/pg/pg-migrate.ts (migration v11 + RLS list)
- apps/api/src/platform/pg/repo/pg-portal-message-repo.ts (new)
- apps/api/src/platform/pg/repo/pg-portal-access-log-repo.ts (new)
- apps/api/src/platform/pg/repo/pg-portal-patient-setting-repo.ts (new)
- apps/api/src/platform/pg/repo/pg-telehealth-room-repo.ts (new)
- apps/api/src/platform/pg/repo/pg-telehealth-room-event-repo.ts (new)
- apps/api/src/platform/pg/repo/index.ts (5 new exports)
- apps/api/src/services/portal-messaging.ts (loose MsgRepo interface)
- apps/api/src/services/portal-settings.ts (add repo interface + init + write-through)
- apps/api/src/telehealth/room-store.ts (loose RoomRepo interface)
- apps/api/src/portal-iam/access-log-store.ts (loosen AccessLogRepo returns)
- apps/api/src/index.ts (5 PG re-wire blocks)
- scripts/qa-gates/restart-durability.mjs (Phase 127 checks)
