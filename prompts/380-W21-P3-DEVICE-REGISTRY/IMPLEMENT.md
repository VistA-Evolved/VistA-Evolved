# Phase 380 — W21-P3 IMPLEMENT: Device Registry + Patient/Location Association

## Goal

Create managed device inventory with serial uniqueness, patient association
(one active per device), location mapping (ward/room/bed), and audit trail.

## Files Created

- `apps/api/src/devices/device-registry.types.ts` — ManagedDevice, Association, Location types
- `apps/api/src/devices/device-registry-store.ts` — In-memory stores + CRUD + audit
- `apps/api/src/devices/device-registry-routes.ts` — 18 REST endpoints

## Files Modified

- `apps/api/src/devices/index.ts` — Added barrel exports
- `apps/api/src/server/register-routes.ts` — Wire deviceRegistryRoutes
- `apps/api/src/middleware/security.ts` — AUTH_RULES /devices/ prefix
- `apps/api/src/platform/store-policy.ts` — 4 store entries (devices domain)

## Key Design

- One active patient association per device (new association auto-ends previous)
- Serial number uniqueness enforced per tenant
- Decommission soft-deletes and ends all associations
- Audit trail captures all lifecycle events (20K max, FIFO)
