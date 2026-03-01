# 400-01-IMPLEMENT — Interop Gateway Layer

## Phase 400 (W23-P2)

### Goal
Implement the Interop Gateway Layer with channels, transform pipelines,
transactions, mediators, and dashboard — modeled after OpenHIM's mediator
architecture but implemented as internal in-memory stores.

### Source Files
- `apps/api/src/interop-gateway/types.ts` — All type definitions
- `apps/api/src/interop-gateway/gateway-store.ts` — CRUD + routing + dashboard
- `apps/api/src/interop-gateway/gateway-routes.ts` — REST endpoints
- `apps/api/src/interop-gateway/index.ts` — Barrel export

### Integration
- Registered in `register-routes.ts`
- AUTH_RULES: `/interop-gateway/` → session
- STORE_INVENTORY: 4 stores (channels, pipelines, transactions, mediators)

### Endpoints
- GET/POST/PUT /interop-gateway/channels
- PUT /interop-gateway/channels/:id/status
- GET/POST/PUT /interop-gateway/pipelines
- GET/POST /interop-gateway/transactions, POST /route
- GET/POST/PUT/DELETE /interop-gateway/mediators
- GET /interop-gateway/dashboard
