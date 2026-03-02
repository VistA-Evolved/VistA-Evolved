# Phase 379 — W21-P2 VERIFY: Edge Device Gateway

## Gates

1. **G1 — Types exist**: `devices/types.ts` exports EdgeGateway, UplinkEnvelope,
   DeviceObservation, GatewayConfig types
2. **G2 — Store exists**: `devices/gateway-store.ts` exports registerGateway,
   ingestUplinkMessage, storeObservation, getStoreStats
3. **G3 — Routes exist**: `devices/gateway-routes.ts` exports default Fastify plugin
4. **G4 — Route wiring**: `register-routes.ts` imports and registers edgeGatewayRoutes
5. **G5 — AUTH_RULES**: security.ts has /edge-gateways/ patterns (admin + service)
6. **G6 — Store policy**: store-policy.ts has 5 device domain entries
7. **G7 — Docker compose**: services/edge-gateway/docker-compose.yml exists with
   profile: gateway
8. **G8 — Sidecar runtime**: services/edge-gateway/gateway.mjs exists with
   heartbeat loop
9. **G9 — Barrel export**: devices/index.ts re-exports routes + cleanup + types
10. **G10 — No PHI**: No patient names, SSN, DOB in any device file
