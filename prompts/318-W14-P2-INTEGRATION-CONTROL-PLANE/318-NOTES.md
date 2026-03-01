# 318 — Notes

## Design Decisions

- **State machine** follows partner lifecycle: draft -> testing -> certified -> active
  with suspend/decommission branches. Matches real-world integration onboarding.
- **Credential refs** store pointers to vault (secretRef), not actual secrets.
  Rotation updates the ref and timestamp, never stores passwords.
- **Test runs** perform 4 structural checks (has endpoints, credentials, routes,
  valid addresses). Network connectivity tests will be added in W14-P7
  (Certification Pipeline).
- **In-memory stores** match the established pattern (Phase 23 imaging, Phase 30
  telehealth). PG migration v31 creates the tables for future durability wiring.
- **Route prefix** `/api/platform/integrations/` chosen to avoid collision with
  existing `/admin/registry/:tenantId/`(Phase 18B/D) routes in interop.ts.

## Inventory (files inspected before editing)

- `apps/api/src/routes/interop.ts` — existing Phase 18B/D integration registry
- `apps/api/src/platform/pg/pg-migrate.ts` — migration system, 30 versions
- `apps/api/src/server/register-routes.ts` — route registration hub
- `apps/api/src/middleware/security.ts` — AUTH_RULES
- `apps/api/src/platform/store-policy.ts` — store inventory
