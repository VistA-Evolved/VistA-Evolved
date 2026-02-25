# Phase 128 — VERIFY: Imaging + Scheduling Durability

## Verification gates

1. **TypeScript clean**: `pnpm -C apps/api exec tsc --noEmit` — 0 errors
2. **Phase 128 restart gate**: `node scripts/qa-gates/imaging-scheduling-restart.mjs` — 70/0
3. **Main restart-durability gate**: `node scripts/qa-gates/restart-durability.mjs` — 192/0
4. **Gauntlet fast**: `node qa/gauntlet/cli.mjs fast` — 4P/0F/1W
5. **Gauntlet G13 gate**: G13_imaging_scheduling_restart passes in rc suite
6. **PG schema**: 4 new tables defined in pg-schema.ts
7. **PG migration v12**: DDL for imaging_work_item, imaging_ingest_event, scheduling_waitlist_request, scheduling_booking_lock
8. **RLS**: All 4 tables in tenant list
9. **Lock TTL**: expires_at column, unique constraint, cleanup on interval

## Manual test (optional, requires PG container running)

```bash
curl http://127.0.0.1:3001/health
# Restart API, verify stores rehydrate from PG
```
