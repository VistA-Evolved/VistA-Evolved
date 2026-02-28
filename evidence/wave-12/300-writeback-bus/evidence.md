# Phase 300 Evidence — Clinical Writeback Command Bus

## Files Created
- `apps/api/src/writeback/types.ts` — 210 lines, 6 domains, 19 intents, 7 command states
- `apps/api/src/writeback/gates.ts` — 107 lines, env-var feature gates
- `apps/api/src/writeback/command-store.ts` — 192 lines, in-memory CRUD with idempotency
- `apps/api/src/writeback/command-bus.ts` — 225 lines, submit/process/dry-run pipeline
- `apps/api/src/writeback/writeback-routes.ts` — 155 lines, 6 REST endpoints
- `apps/api/src/writeback/index.ts` — 42 lines, barrel export

## Files Modified
- `apps/api/src/platform/pg/pg-migrate.ts` — +v30 migration (3 tables), +3 RLS entries
- `apps/api/src/lib/immutable-audit.ts` — +6 audit actions (writeback.*)
- `apps/api/src/platform/store-policy.ts` — +5 store entries
- `apps/api/src/server/register-routes.ts` — +import + register writebackCommandRoutes

## Verification
- 17/17 gates defined in verify-phase300-writeback-bus.ps1
- Safety: all gates OFF, dry-run ON, no raw DFN, no PHI
