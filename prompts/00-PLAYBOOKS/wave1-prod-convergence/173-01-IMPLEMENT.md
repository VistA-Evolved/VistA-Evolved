# Phase 173-178: Production Convergence Wave 1

## User Request

Six queue items delivering production infrastructure hardening:

- Q173: API bootstrap decomposition (index.ts god-file -> thin entrypoint)
- Q174: Postgres-only platform dataplane (remove SQLite path)
- Q175: Schema + migration single source of truth (PG)
- Q176: Tenant context + RLS enforcement (hard invariant)
- Q177: Durability audit + restart-resilience verification
- Q178: FHIR R4 gateway (read-only first)

## Implementation Steps

### Q173 — API Bootstrap Decomposition

1. Create `apps/api/src/server/` directory with:
   - `build-server.ts` — exports `buildServer()`: FastifyInstance
   - `register-plugins.ts` — security, cors, cookie, websocket, tracing hooks
   - `register-routes.ts` — all 92+ route registrations in existing order
   - `lifecycle.ts` — start/stop background jobs + cleanup timers
   - `start.ts` — `startServer()`: listens, handles SIGTERM, calls lifecycle
2. Thin index.ts to ~60 lines: load env/config, call `startServer()`
3. Add smoke test: `apps/api/tests/server-smoke.test.ts`

### Q174 — Postgres-Only Platform Dataplane

1. Remove all imports of `platform/db/**` from active code
2. Remove SQLite repos from store-resolver
3. Update store-resolver to PG-only
4. Remove `better-sqlite3` from dependencies
5. Require `PLATFORM_PG_URL` for all environments

### Q175 — Schema + Migration Single Source of Truth

1. Keep `pg-schema.ts` as canonical types
2. Keep `pg-migrate.ts` as canonical migration runner
3. Remove SQLite migration runner from startup path
4. Add `pnpm -C apps/api db:migrate` script

### Q176 — Tenant Context + RLS Enforcement

1. Ensure tenant context middleware sets `SET LOCAL app.current_tenant_id`
2. Add explicit RLS isolation test
3. Verify all tenant-scoped tables have RLS policies

### Q177 — Durability Audit

1. Inventory all `new Map(` stores
2. Classify: cache / durable / ephemeral
3. Add restart-resilience test for top-risk stores
4. Update store-policy posture

### Q178 — FHIR R4 Gateway

1. Create `apps/api/src/fhir/` with:
   - `fhir-routes.ts` — Fastify plugin with /fhir/metadata and /fhir
   - `capability-statement.ts` — FHIR R4 CapabilityStatement
2. Register in route registration module
3. Add tests with mocked RPC layer

## Verification Steps

- `pnpm -C apps/api build` passes
- `pnpm -C apps/api test` passes
- `pnpm qa:gauntlet:fast` passes
- index.ts <= 250 lines
- No `platform/db/` imports in active code paths
- No `better-sqlite3` imports

## Files Touched

- apps/api/src/index.ts (drastically reduced)
- apps/api/src/server/\*.ts (new)
- apps/api/src/fhir/\*.ts (new)
- apps/api/src/platform/store-resolver.ts (PG-only)
- apps/api/package.json (remove better-sqlite3)
- apps/api/tests/server-smoke.test.ts (new)
- apps/api/tests/rls-isolation.test.ts (new)
- apps/api/tests/fhir.test.ts (new)
