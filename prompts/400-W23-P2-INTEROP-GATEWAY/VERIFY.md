# 400-99-VERIFY — Interop Gateway Layer

## Verification Gates

1. `types.ts` exports GatewayChannel, TransformPipeline, GatewayTransaction, MediatorConfig
2. `gateway-store.ts` has FIFO eviction with `>=`, all CRUD functions
3. `gateway-routes.ts` registers 18+ endpoints with requireSession
4. Route registered in `register-routes.ts`
5. AUTH_RULES entry exists in `security.ts`
6. 4 STORE_INVENTORY entries in `store-policy.ts`
7. `tsc --noEmit` passes cleanly
