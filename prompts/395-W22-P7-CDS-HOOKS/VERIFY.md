# Phase 395 — W22-P7: CDS Hooks + SMART Launch — VERIFY

## Verification Gates

### Gate 1: TypeScript Compilation
- `cd apps/api && pnpm exec tsc --noEmit` -- PASS (zero errors)

### Gate 2: File Inventory
- [x] apps/api/src/cds/types.ts -- CDS Hooks 1.0 types + SMART types + native rule types
- [x] apps/api/src/cds/cds-store.ts -- 6 stores + native engine + CQF adapter
- [x] apps/api/src/cds/cds-routes.ts -- 25 REST endpoints
- [x] apps/api/src/cds/index.ts -- barrel export

### Gate 3: Wiring
- [x] register-routes.ts -- import + server.register(cdsHooksRoutes)
- [x] security.ts -- /cds/cqf/config admin, /cds/* session
- [x] store-policy.ts -- 5 entries (services, rules, smart-apps, launch-contexts, invocation-log)

### Gate 4: API Contract
- GET /cds/services -- discovery (session)
- POST /cds/services -- register service (admin via route)
- DELETE /cds/services/:id -- unregister (admin via route)
- POST /cds/services/:id -- invoke hook (session)
- POST /cds/feedback -- card feedback (session)
- GET /cds/invocations -- invocation log (session)
- GET/POST/PUT/DELETE /cds/rules -- rule CRUD (session/admin)
- GET/PUT /cds/cqf/config -- CQF config (admin)
- GET/POST/PUT/DELETE /cds/smart/apps -- SMART app CRUD
- POST /cds/smart/launch -- create launch context
- GET /cds/smart/launch/:token -- resolve launch
- POST /cds/smart/launch/:token/consume -- consume launch
- GET /cds/dashboard -- stats
- GET /cds/feedback-log -- feedback audit

### Gate 5: Architecture Compliance
- [x] Follows ADR-W22-CDS-ARCH: hybrid native engine + CQF Ruler sidecar
- [x] Native engine uses AND-logic conditions with 11 operators
- [x] CQF Ruler adapter is stub (integration-pending cards when enabled)
- [x] SMART launch contexts have 5-min TTL with auto-expiry
- [x] In-memory stores registered in store-policy.ts
- [x] No PHI in CDS evaluation logs
