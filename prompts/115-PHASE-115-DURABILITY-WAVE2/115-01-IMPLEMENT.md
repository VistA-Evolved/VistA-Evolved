# Phase 115 -- IMPLEMENT: Durability Wave 2 (Portal/Telehealth/Imaging/Idempotency)

## User Request

Replace all durable in-memory Map stores in portal, telehealth, imaging, and
idempotency modules with DB-backed persistence (SQLite default, Postgres-ready).
Sessions, worklist orders, imaging linkages, telehealth rooms, and idempotency
keys must survive API restart.

### Hard Rules

- Do NOT persist raw PHI unless strictly necessary; store references (DFN,
  order_id) and redact logs.
- Use store-resolver so SQLite works in dev and Postgres works in prod.
- Any Map store that represents durable domain state must be replaced.

## Implementation Steps

### Step 1 -- Inventory (completed)

~28 durable domain Maps, ~5 audit stores, ~8 ephemeral caches identified
across portal/telehealth/imaging/idempotency modules.

### Step 2 -- DB Schema (tables AI-AO)

Add 7 new tables to `schema.ts` and `migrate.ts`:

| Table | Letter | Source Map |
|-------|--------|-----------|
| portal_message | AI | messageStore |
| portal_appointment | AJ | appointmentStore |
| telehealth_room | AK | rooms (+ participants sub-map) |
| imaging_work_order | AL | worklistStore |
| imaging_study_link | AM | linkageStore |
| imaging_unmatched | AN | unmatchedStore |
| idempotency_key | AO | memoryStore |

### Step 3 -- Repository Layer

Create repos in `platform/db/repo/`:
- portal-message-repo.ts
- portal-appointment-repo.ts
- telehealth-room-repo.ts
- imaging-worklist-repo.ts
- imaging-ingest-repo.ts
- idempotency-repo.ts

### Step 4 -- Store Rewrites

Rewrite each store module to:
1. Declare a typed repo slot: `let _repo: XxxRepo | null = null;`
2. Export an `initXxxRepo(repo)` function
3. On every mutating call: write to DB if `_repo`, else fall back to Map
4. On reads: try DB first on cache miss, fall back to stale cache
5. Keep an ephemeral in-memory LRU/TTL cache for hot-path reads

Files touched:
- `services/portal-messaging.ts`
- `services/portal-appointments.ts`
- `telehealth/room-store.ts`
- `services/imaging-worklist.ts`
- `services/imaging-ingest.ts`
- `middleware/idempotency.ts`

### Step 5 -- Wiring in index.ts

Add lazy-init blocks after `initPlatformDb()` for each new repo:
```typescript
// Phase 115: Wire portal-messaging to DB
try {
  const mod = await import("./platform/db/repo/portal-message-repo.js");
  const { initMessageRepo } = await import("./services/portal-messaging.js");
  initMessageRepo(mod);
  log.info("Portal messaging wired to DB");
} catch (e: any) {
  log.warn("Portal messaging wire failed", { error: e.message });
}
// ... repeat for each module
```

### Step 6 -- Verification script + runbook

- `scripts/verify-phase115-durability-wave2.ps1`
- `docs/runbooks/durability-wave2.md`
- Update `scripts/verify-latest.ps1`

## Verification Steps

1. TypeScript clean compile (zero errors)
2. API starts without crash
3. Portal message draft persists across API restart
4. Telehealth room persists across API restart
5. Imaging worklist order persists across API restart
6. Idempotency key replays correctly after restart
7. No raw tokens or passwords in any new column
8. console.log count <= 6 across codebase

## Files Touched

- `apps/api/src/platform/db/schema.ts` (7 new table definitions)
- `apps/api/src/platform/db/migrate.ts` (7 new DDL blocks)
- `apps/api/src/platform/db/repo/portal-message-repo.ts` (new)
- `apps/api/src/platform/db/repo/portal-appointment-repo.ts` (new)
- `apps/api/src/platform/db/repo/telehealth-room-repo.ts` (new)
- `apps/api/src/platform/db/repo/imaging-worklist-repo.ts` (new)
- `apps/api/src/platform/db/repo/imaging-ingest-repo.ts` (new)
- `apps/api/src/platform/db/repo/idempotency-repo.ts` (new)
- `apps/api/src/platform/db/repo/index.ts` (barrel)
- `apps/api/src/services/portal-messaging.ts` (rewrite)
- `apps/api/src/services/portal-appointments.ts` (rewrite)
- `apps/api/src/telehealth/room-store.ts` (rewrite)
- `apps/api/src/services/imaging-worklist.ts` (rewrite)
- `apps/api/src/services/imaging-ingest.ts` (rewrite)
- `apps/api/src/middleware/idempotency.ts` (rewrite)
- `apps/api/src/index.ts` (wiring)
- `scripts/verify-phase115-durability-wave2.ps1` (new)
- `scripts/verify-latest.ps1` (update)
- `docs/runbooks/durability-wave2.md` (new)
- `prompts/115-PHASE-115-DURABILITY-WAVE2/115-01-IMPLEMENT.md` (this file)
