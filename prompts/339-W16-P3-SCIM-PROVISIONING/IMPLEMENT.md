# Phase 339 — W16-P3 — SCIM Provisioning — IMPLEMENT

## Objective

Implement SCIM 2.0 (RFC 7643/7644) provisioning endpoints for automated
user/group lifecycle from external IdPs (Azure AD, Okta, OneLogin).

## What Changed

1. **`apps/api/src/auth/scim-server.ts`** — In-process SCIM connector
   - Full `InProcessScimConnector` implementing `ScimConnector` interface
   - In-memory stores for SCIM users + groups (DB-backed when PG available)
   - externalId-based idempotency (upsert on create if externalId exists)
   - Group membership management (add/remove members)
   - Role mapping from SCIM groups to VistA UserRole
   - Tenant isolation on all operations

2. **`apps/api/src/routes/scim-routes.ts`** — SCIM 2.0 REST endpoints
   - `GET /scim/v2/ServiceProviderConfig` — capability discovery
   - `GET /scim/v2/Schemas` — schema discovery
   - `GET /scim/v2/ResourceTypes` — resource type discovery
   - `POST /scim/v2/Users` — create user
   - `GET /scim/v2/Users/:id` — read user
   - `GET /scim/v2/Users` — list/filter users
   - `PUT /scim/v2/Users/:id` — replace user
   - `PATCH /scim/v2/Users/:id` — patch user
   - `DELETE /scim/v2/Users/:id` — deactivate user
   - `POST /scim/v2/Groups` — create group
   - `GET /scim/v2/Groups/:id` — read group
   - `GET /scim/v2/Groups` — list groups
   - `PATCH /scim/v2/Groups/:id` — patch group (add/remove members)
   - `DELETE /scim/v2/Groups/:id` — delete group
   - Bearer token auth on all SCIM endpoints

3. **PG migration v34** — `phase339_scim_provisioning`
   - `scim_user` table (id, tenant_id, external_id, user_name, display_name, etc.)
   - `scim_group` table (id, tenant_id, external_id, display_name)
   - `scim_group_member` table (group_id, user_id)
   - Unique constraints on (tenant_id, external_id) for idempotency

4. **Updated `middleware/security.ts`** — AUTH_RULES for `/scim/` routes

## Files Touched

- `apps/api/src/auth/scim-server.ts` (NEW)
- `apps/api/src/routes/scim-routes.ts` (NEW)
- `apps/api/src/platform/pg/pg-migrate.ts` (EDIT — add v34)
- `apps/api/src/middleware/security.ts` (EDIT — add SCIM auth rule)
- `prompts/339-W16-P3-SCIM-PROVISIONING/` (NEW)
