# Phase 329 — W15-P3: Global Routing (IMPLEMENT)

## User Request

Implement global routing layer with tenant resolution, DNS record management,
regional ingress, and DNS-based failover (per ADR-GLOBAL-ROUTING).

## Implementation Steps

1. Create `apps/api/src/services/global-routing.ts`:
   - Tenant resolution: subdomain > path prefix (/t/<tenant>/) > X-Tenant-Id header > default
   - Full route resolution: tenant → placement → cluster → ingress
   - Regional ingress registry with health tracking
   - DNS record management (CNAME/A/AAAA records per tenant)
   - Failover lifecycle: initiate → (lower TTL) → complete → (update DNS target)
   - Routing config with env var defaults (ROUTING_BASE_DOMAIN, ROUTING_DEFAULT_REGION, etc.)
   - Routing summary and audit log

2. Create `apps/api/src/routes/global-routing-routes.ts`:
   - 17 REST endpoints under /platform/routing/
   - Config, resolve, audit, ingress CRUD, DNS CRUD, failover management
   - Admin-only via AUTH_RULES

3. Wire into security.ts, register-routes.ts, store-policy.ts

## Files Touched

- apps/api/src/services/global-routing.ts (NEW)
- apps/api/src/routes/global-routing-routes.ts (NEW)
- apps/api/src/middleware/security.ts (+1 AUTH_RULE)
- apps/api/src/server/register-routes.ts (+import/register)
- apps/api/src/platform/store-policy.ts (+4 store entries)
