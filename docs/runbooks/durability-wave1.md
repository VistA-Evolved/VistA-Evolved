# Phase 114: Durability Wave 1 -- Runbook

## What Changed

Three in-memory stores replaced with DB-backed persistence:

| Store | Before | After | DB Table(s) |
|-------|--------|-------|-------------|
| Session store | `Map<string, SessionData>` | SQLite + 60s cache | `auth_session` |
| RCM workqueue | `Map<string, WorkqueueItem>` | SQLite | `rcm_work_item` + `rcm_work_item_event` |
| Capability matrix audit | No audit trail | Writes to `payer_audit_event` | `payer_audit_event` |

## Architecture

### Sessions (`auth_session`)
- Raw tokens are NEVER stored -- only SHA-256 hashes
- 60-second in-memory cache avoids DB hit on every request
- Cache is ephemeral and reconstructable from DB on miss
- `initSessionRepo()` wired in `index.ts` after `initPlatformDb()`
- Graceful degradation: if DB unavailable, falls back to cache-only

### Workqueues (`rcm_work_item` + `rcm_work_item_event`)
- Every create/update writes to SQLite
- Append-only audit trail in `rcm_work_item_event`
- Priority-based SQL ordering (CASE expression)
- `initWorkqueueRepo()` wired in `index.ts` after `initPlatformDb()`

### Capability Audit
- All `setCapability()`, `addEvidence()`, `removeEvidence()` calls write
  audit events to the existing `payer_audit_event` table
- Matrix state remains in-memory (reconstructable from seeds)
- `initCapabilityAudit()` wired in `index.ts` after `initPlatformDb()`

## Startup Sequence

```
server.listen()
  -> initPlatformDb()
    -> runMigrations() (creates auth_session, rcm_work_item, rcm_work_item_event)
    -> initSessionRepo(sessionRepoMod)
    -> initWorkqueueRepo(wqRepoMod)
    -> initCapabilityAudit({ getDb, payerAuditEvent })
    -> seedModuleCatalogFromConfig()
```

## Testing

### Automated
```powershell
.\scripts\verify-phase114-durability-wave1.ps1
# or
node scripts/qa-gates/restart-durability.mjs
```

### Manual restart-durability test
```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login (creates a session)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' \
  -c cookies.txt

# 3. Kill API (Ctrl+C)

# 4. Restart API
npx tsx --env-file=.env.local src/index.ts

# 5. Verify session persists (re-use the cookie)
curl http://localhost:3001/vista/default-patient-list -b cookies.txt
# Should return {ok: true, ...} without re-login
```

## Files Changed

### New files
- `apps/api/src/platform/db/repo/session-repo.ts` -- Session DB CRUD
- `apps/api/src/platform/db/repo/workqueue-repo.ts` -- Workqueue DB CRUD
- `scripts/qa-gates/restart-durability.mjs` -- QA gate (25 checks)
- `scripts/verify-phase114-durability-wave1.ps1` -- Full verifier
- `docs/architecture/store-policy.md` -- Store classification standard
- `prompts/118-PHASE-114-DURABILITY-WAVE1/114-01-IMPLEMENT.md`
- `prompts/118-PHASE-114-DURABILITY-WAVE1/114-99-VERIFY.md`

### Modified files
- `apps/api/src/platform/db/schema.ts` -- +3 tables (AF, AG, AH)
- `apps/api/src/platform/db/migrate.ts` -- +3 CREATE TABLE + 10 indexes
- `apps/api/src/platform/db/repo/index.ts` -- +2 barrel exports
- `apps/api/src/auth/session-store.ts` -- DB-backed with cache
- `apps/api/src/rcm/workqueues/workqueue-store.ts` -- DB-backed
- `apps/api/src/rcm/payerOps/capability-matrix.ts` -- +audit trail
- `apps/api/src/index.ts` -- +3 init wiring blocks
- `scripts/verify-latest.ps1` -- Points to Phase 114

## Troubleshooting

**Sessions lost after restart despite DB:**
Check that `initPlatformDb()` succeeds (look for "Platform DB init" log).
If it fails, session store falls back to cache-only (pre-Phase 114 behavior).

**Workqueue items not persisting:**
Check "Workqueue store wired to DB" log at startup. If missing, the
`initWorkqueueRepo()` call failed -- check for schema migration errors.

**Capability audit events not appearing:**
Check "Capability matrix audit wired to DB" log. Query with:
```sql
SELECT * FROM payer_audit_event WHERE entity_type = 'capability_matrix' ORDER BY created_at DESC LIMIT 10;
```
