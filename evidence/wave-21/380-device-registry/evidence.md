# W21-P3 Evidence: Device Registry + Patient/Location Association

## Files Created
- `apps/api/src/devices/device-registry.types.ts` — Types (ManagedDevice, Association, Location, Audit)
- `apps/api/src/devices/device-registry-store.ts` — Store (~310 lines)
- `apps/api/src/devices/device-registry-routes.ts` — Routes (18 endpoints, ~240 lines)

## Files Modified  
- `devices/index.ts` — Added deviceRegistryRoutes + type exports
- `register-routes.ts` — Added server.register(deviceRegistryRoutes)
- `security.ts` — Added /devices/ → admin AUTH_RULE
- `store-policy.ts` — Added 4 store entries

## Verification
- Serial uniqueness index enforced per tenant ✓
- One active association per device (auto-end) ✓
- Decommission ends all active associations ✓
- Audit trail FIFO at 20K max ✓
- 18 REST endpoints covering CRUD, association, location, audit ✓
