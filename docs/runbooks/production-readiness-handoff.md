# Production Readiness Handoff

## Purpose

This handoff is the shortest path for a real engineering team to understand the
current runtime truth of `VistA-Evolved`, where the system is already real, and
where it still depends on controlled fallbacks or integration-pending behavior.

## Canonical Runtime

- Backend: `apps/api` Fastify service on `127.0.0.1:3001`
- Clinician UI: `apps/web/src/app/cprs/`
- Portal UI: `apps/portal/`
- Preferred VistA dev lane: VEHU on port `9431`
- Platform database: PostgreSQL (`services/platform-db/`)
- Distributed state target: Redis when `REDIS_URL` is configured

## Canonical Route Families

- Prefer `apps/api/src/routes/**` domain routes and `apps/api/src/routes/cprs/**`
  for clinician workflows.
- Treat `apps/api/src/server/inline-routes.ts` as compatibility surface and
  gradually converge overlapping domains into one canonical implementation.
- Verified convergence in this remediation pass:
  - `/vista/problems` now uses `ORQQPL PROBLEM LIST`
  - `/api/modules/status` prefers DB-backed entitlements only when a tenant is
    actually provisioned in PG
  - idempotent CPRS sign requests replay safely across duplicate calls

## Startup Truth

- Start the API with:
  - `npx tsx --env-file=.env.local src/index.ts`
- `pnpm verify:vista` now loads `apps/api/.env.local` and verifies the VEHU lane.
- On PG-enabled startup, the API now wires:
  - session store
  - idempotency store
  - workqueue store
  - durable queue bootstrap
  - multiple PG-backed domain repos already present in the repo

## Multi-Tenant Truth

- Request tenant resolution must come from the main Fastify plugin path.
- The tenant hook is now registered before module guarding.
- DB-backed entitlements are enforced at request time only for tenants that are
  actually provisioned in PG.
- Unprovisioned tenants fall back to SKU defaults instead of being falsely
  blocked by empty entitlement tables.

## Proof Commands

- VistA connectivity:
  - `pnpm verify:vista`
- Live runtime truth map:
  - `pnpm qa:runtime-truth`
- Fast gauntlet:
  - `pnpm qa:gauntlet:fast`

`qa:runtime-truth` writes evidence to `artifacts/runtime-truth-map/latest.json`.

## Known Gaps

- `REDIS_URL` is still unset in the current dev runtime, so Redis-backed
  distributed state is not active yet.
- Audit shipping remains disabled unless `AUDIT_SHIP_ENABLED=true`.
- Default tenant entitlements are still SKU-driven because the default tenant is
  not yet provisioned in the PG entitlement tables.
- The repo still contains overlapping legacy UI surfaces that should be treated
  as deprecated, not canonical.

## What To Do Next

1. Provision tenants explicitly into the PG entitlement tables instead of
   relying on default SKU fallback.
2. Enable Redis in non-local environments and migrate any remaining critical
   `Map`-based locks/rate-limiters to distributed implementations.
3. Continue collapsing compatibility routes in `inline-routes.ts` into domain
   plugins with one canonical client path per clinical area.
