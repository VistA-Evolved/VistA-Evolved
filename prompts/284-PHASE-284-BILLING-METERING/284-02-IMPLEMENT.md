# Phase 284-02: Billing Provider Safety Hardening

## User Request

Eliminate "silent mock billing" risk and make billing readiness explicit for demos/prod.

## Implementation Steps

1. **Fail-fast guard in `initBillingProvider()`** — If NODE_ENV=production, PLATFORM_RUNTIME_MODE=rc|prod, or DEPLOYMENT_STAGE=demo|pilot|prod, the mock provider is blocked. The API refuses to start with a clear error message listing what is wrong, what env vars are required, and an example config.

2. **Loud dev warning** — In dev/test mode, mock is allowed but logs a prominent warning banner at startup.

3. **Enhanced `/billing/health` endpoint** — Added `GET /billing/health` (session auth) alongside existing `GET /admin/billing/health` (admin auth). Both return a structured `BillingHealthStatus` response with `ok`, `provider`, `healthy`, `configuredForProduction`, and `details`.

4. **Enriched health check responses** — Mock provider returns `configuredForProduction: false` with explicit warning. Lago provider returns `configuredForProduction: true` and probes the Lago API for reachability.

5. **Updated `BillingHealthStatus` type** — New exported interface in `types.ts` used by both providers and the routes.

6. **AUTH_RULES update** — Added `/billing/health` as session-auth route.

7. **Docs** — Created `docs/runbooks/billing-provider-readiness.md` with env configs for dev/demo/prod and troubleshooting table.

8. **`.env.example` updated** — Added DEPLOYMENT_STAGE var and clarified mock-only-in-dev constraint.

## Verification Steps

1. No TypeScript compilation errors in billing files
2. Existing e2e test for `/admin/billing/health` still passes (response is additive)
3. UI page.tsx backward-compatible (still reads `health.ok`)
4. In default dev mode (no env vars): mock provider initializes with loud warning
5. With `DEPLOYMENT_STAGE=demo` and no BILLING_PROVIDER: API refuses to start
6. With `BILLING_PROVIDER=lago` + Lago credentials: API starts normally

## Files Touched

- `apps/api/src/billing/index.ts` — Fail-fast guard + loud warning
- `apps/api/src/billing/types.ts` — `BillingHealthStatus` interface
- `apps/api/src/billing/mock-provider.ts` — Enriched health check
- `apps/api/src/billing/lago-provider.ts` — Enriched health check
- `apps/api/src/billing/billing-routes.ts` — Public `/billing/health` route
- `apps/api/src/middleware/security.ts` — AUTH_RULES for `/billing/health`
- `apps/api/.env.example` — DEPLOYMENT_STAGE + billing docs
- `docs/runbooks/billing-provider-readiness.md` — New runbook
