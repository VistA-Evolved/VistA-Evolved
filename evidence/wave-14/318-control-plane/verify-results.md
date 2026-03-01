# Phase 318 Evidence — Integration Control Plane v2

## Verify Results

| Gate | Result |
|------|--------|
| Service file exists | PASS — services/integration-control-plane.ts (310+ lines) |
| Routes file exists (15 endpoints) | PASS — routes/integration-control-plane-routes.ts |
| Migration v31 (5 CREATE TABLE) | PASS — pg-migrate.ts version 31 |
| 5 tables in CANONICAL_RLS_TABLES | PASS — integration_partner, integration_endpoint, integration_credential_ref, integration_route, integration_test_run |
| AUTH_RULES for /api/platform/integrations/ | PASS — admin level |
| Route registered in register-routes.ts | PASS — after Wave 13 block |
| 5 store entries in store-policy.ts | PASS — interop domain, registry/dev_only classifications |
| No TypeScript compile errors | PASS — tsc --noEmit clean |

## Files Changed

- apps/api/src/services/integration-control-plane.ts (NEW)
- apps/api/src/routes/integration-control-plane-routes.ts (NEW)
- apps/api/src/platform/pg/pg-migrate.ts (v31 + RLS)
- apps/api/src/middleware/security.ts (AUTH_RULES)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (5 entries)
