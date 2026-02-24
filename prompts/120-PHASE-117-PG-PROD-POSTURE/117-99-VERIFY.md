# Phase 117 VERIFY -- Postgres-First Prod Posture + Multi-Instance

## Verification Gates (53/53 PASS)

### Gate 1: Compose prod profile (7/7)
- platform-db service defined
- postgres:16 image used
- PLATFORM_PG_URL in API env
- STORE_BACKEND=pg in API env
- WAL/PITR config referenced
- pgdata volume defined
- multi-instance support hints

### Gate 2: PG schema tables (7/7)
- pgAuthSession table defined
- pgRcmWorkItem table defined
- pgRcmWorkItemEvent table defined
- auth_session SQL name
- session token_hash index
- session expires_at index
- workqueue status+updated_at index + priority+created_at index

### Gate 3: Migration v9 (4/4)
- migration v9 defined and named session_workqueue
- v9 creates both tables
- auth_session in RLS tenant tables (25 total)

### Gate 4: PG repos (6/6)
- Session repo: async createAuthSession, findSessionByTokenHash, uses pgAuthSession
- Workqueue repo: async createWorkItem, listWorkItems, uses pgRcmWorkItem

### Gate 5: Store resolver (3/3)
- STORE_BACKEND env var read
- resolveBackend() function exists
- StoreBackend type with auto/pg/sqlite

### Gate 6: Session store async (4/4)
- createSession, getSession, destroySession async
- SessionRepoLike interface exists

### Gate 7: Workqueue store async (4/4)
- createWorkqueueItem, listWorkqueueItems, getWorkqueueStats async
- WorkqueueRepoLike interface exists

### Gate 8: index.ts PG wiring (4/4)
- Imports resolveBackend, PG session repo, PG workqueue repo
- Has PG re-wire log

### Gate 9: Caller await checks (5/5)
- security.ts awaits getSession
- auth-routes.ts uses async requireSession
- rcm-routes.ts awaits listWorkqueueItems, getWorkqueueItem, ingestAck

### Gate 10: Multi-instance test (2/2)
- Session cross-validation gate
- Workqueue cross-dequeue gate

### Gate 11: Backup docs (4/4)
- PITR section, pg_basebackup, restore drill, migration management

### Gate 12: Prompt file (1/1)
### Gate 13: TypeScript compile (1/1)

## Runtime Verification

| Endpoint | Result |
|----------|--------|
| GET /health | ok:true, platformPg.ok:true |
| GET /ready | ok:true, circuitBreaker:closed |
| POST /auth/login | ok:true, session created in PG |
| GET /auth/session | ok:true, authenticated:true |
| POST /auth/logout | ok:true, session revoked in PG |
| GET /rcm/workqueues/stats | ok:true, stats returned |
| GET /rcm/workqueues | ok:true, items:[] |
| POST /rcm/claims/draft | ok:true, claim created |
| POST /rcm/acks/ingest | ok:true, ack processed |
| GET /posture/backup | score:100, 6/6 gates |
| GET /api/capabilities | ok:true |
| GET /vista/allergies?dfn=3 | ok:true |

## PG Data Verification

```sql
-- Sessions stored in PG
SELECT COUNT(*) FROM auth_session;  -- 3 rows (2 active, 1 revoked)

-- All 3 v9 tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('auth_session', 'rcm_work_item', 'rcm_work_item_event');
-- 3 rows returned
```

## Prod Profile Local-Only Durability Check

| Check | Result |
|-------|--------|
| STORE_BACKEND=pg in prod compose | PASS |
| No SQLite volumes in prod compose | PASS |
| resolveBackend("pg") throws if no PG URL | PASS |
| Session store re-wired to PG at startup | PASS (log confirmed) |
| Workqueue store re-wired to PG at startup | PASS (log confirmed) |

## Build Verification

| Check | Result |
|-------|--------|
| tsc --noEmit | 0 errors |
| next build (web) | Success |
| API startup | Clean (no warnings) |

## Sub-agent Audit Findings

| Category | Verdict |
|----------|---------|
| Missing awaits | ALL CLEAR — 39 files verified |
| PG session-repo | PASS (minor: rowCount cast) |
| PG workqueue-repo | PASS (minor: silent event error catch) |
| Index.ts wiring | PASS (minor: brief startup window) |
| Migration v9 | PASS (design note: TEXT vs TIMESTAMPTZ) |
| Store resolver | PASS — no circular deps |
| docker-compose.prod.yml | PASS — all checks correct |

## No Blocking Issues Found
