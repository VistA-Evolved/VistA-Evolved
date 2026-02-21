# Phase 59 -- VERIFY: CPOE Parity (Orders + Order Checks + Signing)

## Verification Gates

### G59-01: Inventory artifact exists
- `artifacts/phase59/inventory.json` contains order-related UI, API, RPCs, registry entries

### G59-02: Order plan artifact exists
- `artifacts/phase59/order-plan.json` contains per-flow RPC sequences

### G59-03: Order list endpoint (READ)
- `GET /vista/cprs/orders` calls ORWORR AGET or ORWORR GET and returns real data or honest pending

### G59-04: Lab order endpoint (WRITE)
- `POST /vista/cprs/orders/lab` calls ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK or honest pending
- Audit event emitted on write

### G59-05: Imaging order endpoint
- `POST /vista/cprs/orders/imaging` calls real RPC or returns integration-pending with target RPCs

### G59-06: Order checks endpoint
- `POST /vista/cprs/order-checks` calls ORWDXC family or returns integration-pending with target RPCs

### G59-07: Signing endpoint
- `POST /vista/cprs/orders/sign` calls ORWOR1 SIG or returns integration-pending with target RPCs

### G59-08: Registry updated
- rpcRegistry.ts contains ORWORR AGET, ORWDXC ACCEPT, ORWOR1 SIG (or equivalents)

### G59-09: Audit actions
- audit.ts contains clinical.order-lab, clinical.order-imaging, clinical.order-check, clinical.order-sign

### G59-10: OrdersPanel upgraded
- OrdersPanel.tsx connects to real API endpoints (not draft-only for lab/imaging)
- Order checks displayed before submit
- Unsigned/signed status labels visible

### G59-11: No PHI in logs, no fake success
- No PHI in audit detail
- No hardcoded mock data in order routes
- No console.log in new code

### G59-12: Dead-click audit
- Every button in Orders tab has a real endpoint or shows integration-pending

## Script
```
scripts/verify-phase59-cpoe-parity.ps1
```

## Commit
```
Phase59: CPOE parity (orders + order checks + signing posture)
```
