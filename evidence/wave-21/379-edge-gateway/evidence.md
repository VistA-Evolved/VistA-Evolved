# W21-P2 Evidence: Edge Device Gateway

## Files Created
| File | Lines | Purpose |
|------|-------|---------|
| `apps/api/src/devices/types.ts` | ~160 | Type definitions |
| `apps/api/src/devices/gateway-store.ts` | ~310 | In-memory stores + CRUD |
| `apps/api/src/devices/gateway-routes.ts` | ~270 | 16 REST endpoints |
| `apps/api/src/devices/index.ts` | ~18 | Barrel export |
| `services/edge-gateway/docker-compose.yml` | ~40 | Sidecar compose |
| `services/edge-gateway/gateway.mjs` | ~100 | Sidecar runtime |
| `docs/runbooks/edge-device-gateway.md` | ~80 | Runbook |

## Files Modified
| File | Change |
|------|--------|
| `register-routes.ts` | +import + server.register + startGatewayCleanup |
| `security.ts` | +3 AUTH_RULES (service for uplink/heartbeat, admin for rest) |
| `store-policy.ts` | +5 store entries (gateways, observations, uplink, configs, idempotency) |

## Verification
- Types exported: EdgeGateway, UplinkEnvelope, DeviceObservation, GatewayConfig ✓
- Store functions: registerGateway, ingestUplinkMessage, storeObservation, getStoreStats ✓
- Routes: 16 endpoints covering CRUD, health, config, uplink, observations ✓
- AUTH_RULES: uplink/heartbeat = service, management = admin ✓
- Store policy: 5 entries in "devices" domain ✓
- Docker compose: profile: gateway, volumes, env vars ✓
- No PHI: No patient names, SSN, DOB in any file ✓
