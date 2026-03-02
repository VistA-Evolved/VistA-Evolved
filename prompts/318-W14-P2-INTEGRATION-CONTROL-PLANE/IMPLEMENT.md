# 318 — W14-P2: Integration Control Plane v2

## Request

Build the Integration Control Plane v2 that makes integrations first-class
platform objects with typed lifecycle, credential management, and connectivity
testing.

## Implementation Steps

1. **Service layer** (`apps/api/src/services/integration-control-plane.ts`)
   - Types: IntegrationPartner, IntegrationEndpoint, IntegrationCredentialRef,
     IntegrationRoute, IntegrationTestRun
   - State machine: draft -> testing -> certified -> active -> suspended -> decommissioned
   - In-memory stores (5 Maps) for partners, endpoints, credentials, routes, test runs
   - Full CRUD for all entity types
   - Test run system with 4 checks: has_endpoint, has_credentials, has_routes, valid_addresses

2. **Routes** (`apps/api/src/routes/integration-control-plane-routes.ts`)
   - 15 REST endpoints under `/api/platform/integrations/partners/*`
   - Admin-only (AUTH_RULES pattern match)
   - Full CRUD for partners, endpoints, credentials, routes
   - Test run start/get/list

3. **Migration v31** (`apps/api/src/platform/pg/pg-migrate.ts`)
   - 5 tables: integration_partner, integration_endpoint, integration_credential_ref,
     integration_route, integration_test_run
   - All with tenant_id columns for RLS

4. **RLS** — Added all 5 tables to CANONICAL_RLS_TABLES

5. **AUTH_RULES** — `/api/platform/integrations/` -> admin

6. **Route registration** — Wired in register-routes.ts after Wave 13 block

7. **Store policy** — 5 entries registered in STORE_INVENTORY (interop domain)

## Files Touched

- `apps/api/src/services/integration-control-plane.ts` (new)
- `apps/api/src/routes/integration-control-plane-routes.ts` (new)
- `apps/api/src/platform/pg/pg-migrate.ts` (migration v31 + RLS)
- `apps/api/src/middleware/security.ts` (AUTH_RULES)
- `apps/api/src/server/register-routes.ts` (import + register)
- `apps/api/src/platform/store-policy.ts` (5 store entries)
