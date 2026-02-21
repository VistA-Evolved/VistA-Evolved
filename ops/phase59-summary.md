# Phase 59 Summary -- CPOE Parity (Orders + Order Checks + Signing)

## What Changed

### API (apps/api)
- **New file: `routes/cprs/orders-cpoe.ts`** (~460 lines)
  - `GET /vista/cprs/orders` -- Fetches active orders via ORWORR AGET, parses IEN/name/status/dates
  - `POST /vista/cprs/orders/lab` -- Lab order entry with LOCK/AUTOACK/UNLOCK (integration-pending: no LRZ* quick orders in sandbox)
  - `POST /vista/cprs/orders/imaging` -- Imaging order entry (integration-pending: needs RA* quick orders)
  - `POST /vista/cprs/orders/consult` -- Consult order entry (integration-pending: needs ORDIALOG #101.43)
  - `POST /vista/cprs/orders/sign` -- Electronic signing via ORWOR1 SIG (integration-pending without esCode)
  - `POST /vista/cprs/order-checks` -- Order check retrieval via ORWDXC ACCEPT/DISPLAY
- **rpcRegistry.ts** -- Added 5 RPCs: ORWORR AGET, ORWOR1 SIG, ORWDXC ACCEPT, ORWDXC DISPLAY, ORWDXC SAVECHK
- **audit.ts** -- Added 5 audit actions: phi.orders-view, clinical.order-lab, clinical.order-imaging, clinical.order-consult, clinical.order-check
- **index.ts** -- Registered ordersCpoeRoutes plugin

### Web UI (apps/web)
- **OrdersPanel.tsx** -- Major upgrade:
  - Fetches VistA active orders on mount via GET /vista/cprs/orders
  - Lab/imaging/consult orders POST to real CPOE endpoints (not draft-only)
  - Sign button calls POST /vista/cprs/orders/sign (shows integration-pending honestly)
  - Order checks button runs POST /vista/cprs/order-checks and displays results
  - VistA orders section shows real data with source indicator
  - No dead clicks -- every button has a real endpoint or integration-pending feedback

### Artifacts
- `artifacts/phase59/inventory.json` -- Full order state inventory
- `artifacts/phase59/order-plan.json` -- Per-flow RPC sequences (7 flows)

### Prompts
- `prompts/64-PHASE-59-CPOE-PARITY/59-01-IMPLEMENT.md`
- `prompts/64-PHASE-59-CPOE-PARITY/59-99-VERIFY.md`

## How to Test Manually

1. Start VistA Docker: `cd services/vista && docker compose --profile dev up -d`
2. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
3. Start web: `cd apps/web && pnpm dev`
4. Login, select patient, go to Orders tab
5. Click Refresh -- VistA active orders should load (source: vista)
6. Place medication order (ASPIRIN) -- should succeed via AUTOACK
7. Place lab order -- should return integration-pending with draft saved
8. Click Run Order Checks on any order -- shows checks or integration-pending
9. Click Sign Order -- shows integration-pending (esCode not configured)

## Verifier Output

```
scripts/verify-phase59-cpoe-parity.ps1 -Verbose
12/12 gates PASS
```

## Follow-ups
- Lab quick orders (LRZ*) need configuration in WorldVistA Docker for live lab ordering
- Imaging quick orders (RAD*) need RA package configuration
- Consult ordering needs full ORDIALOG parameter construction
- E-signature code (esCode) needs credential flow for real signing
- Order checks context needs active order IENs from prior order placement
