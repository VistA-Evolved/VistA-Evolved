# ADR: SCIM Support

**Status:** Accepted  
**Date:** 2026-03-01  
**Phase:** 337 (Wave 16 P1)  
**Deciders:** Architecture team

## Context

Enterprise customers require automated user provisioning from identity providers
(Azure AD, Okta, OneLogin, Ping). SCIM 2.0 (RFC 7643/7644) is the industry
standard protocol. VistA-Evolved already has:
- `auth/scim-connector.ts` — Full interface + `StubScimConnector` (Phase 141)
- `auth/idp-role-mapper.ts` — IdP claim to role mapping
- `auth/session-store.ts` — DB-backed sessions with role/tenant binding
- VistA user extension schema defined (`urn:ietf:params:scim:schemas:extension:vista:2.0:User`)

The stub connector throws `ScimNotImplementedError` for all operations.

## Decision

**Build minimal SCIM v2 server endpoints** on top of the existing
`ScimConnector` interface, backed by PG storage with tenant isolation.

Rationale:
- Interface already designed and tested at compile time
- Extension schema for VistA DUZ binding already defined
- In-process implementation avoids external SCIM server dependency
- Feature-flagged so it can be enabled per-tenant when IdP is configured
- Faster to deploy than integrating a third-party SCIM server

## Alternatives Considered

### Option A: Build Minimal SCIM Server Endpoints (CHOSEN)
- **Pros:** Full control, no external deps, aligned with existing interface,
  tenant-isolated by design
- **Cons:** Must implement RFC compliance ourselves, handle edge cases
- **Selected:** Minimal viable compliance (Users + Groups + PATCH) is tractable

### Option B: Integrate External IdP SCIM (e.g., SCIM Bridge)
- **Pros:** Full RFC compliance out of box, battle-tested
- **Cons:** External container, licensing cost, network dependency, must still
  map to internal user model
- **Rejected:** Adds infrastructure and licensing complexity for a feature that
  can be built on the existing interface

### Option C: Hybrid (SCIM proxy → internal API)
- **Pros:** External SCIM compliance + internal flexibility
- **Cons:** Two systems to maintain, proxy adds latency, versioning complexity
- **Rejected:** Over-engineering for current requirements

## Implementation Plan

1. Implement `InProcessScimConnector` replacing `StubScimConnector`
2. PG tables: `scim_user`, `scim_group`, `scim_group_member`
3. Routes: `GET/POST /scim/v2/Users`, `GET/POST /scim/v2/Groups`, `PATCH` for both
4. SCIM → internal role mapping via `idp-role-mapper.ts`
5. `externalId` uniqueness enforced per tenant (idempotent provisioning)
6. Disable user = revoke all sessions + set `active: false`
7. Feature flag: `SCIM_ENABLED=true` (default false)
8. Bearer token auth for SCIM endpoints (separate from session auth)

## Operational Notes

- SCIM endpoints require `scim_admin` permission (not regular session auth)
- Bearer tokens for SCIM are per-tenant, stored hashed in PG
- All provisioning events logged to immutable audit
- No PHI in SCIM payloads (user metadata only, no clinical data)
- Bulk operations deferred (batch of 1-by-1 acceptable for initial release)

## Rollback Plan

1. Set `SCIM_ENABLED=false` (routes return 404)
2. SCIM-provisioned users remain in the platform (they were synced, not removed)
3. If full rollback needed: disable via feature flag, SCIM users continue
   with manual management
4. PG tables can be dropped without affecting core auth (SCIM is additive)
