# Phase 339 — W16-P3 — SCIM Provisioning — NOTES

## Key Decisions

- **In-process connector**: Stores in-memory Map + PG tables when available
- **externalId idempotency**: If externalId already exists, return existing user (no duplicate)
- **SCIM groups map to VistA roles** via group display_name prefix (e.g., "role:admin")
- **Bearer token auth**: SCIM_BEARER_TOKEN env var, validated on all /scim/ routes
- **Feature flag**: SCIM_ENABLED=true required, else 501 on all endpoints
- **ScimGroup type** added as a new interface alongside ScimUser

## Reused Infrastructure

- `scim-connector.ts` — ScimConnector interface, ScimUser, ScimListResponse types
- `session-store.ts` — UserRole type
- `immutable-audit.ts` — audit all provisioning operations
- `pg-migrate.ts` — v34 follows established migration pattern
