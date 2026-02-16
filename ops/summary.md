# Phase 14: CPRS Parity Gap Closure + Compatibility Layer

## What Changed

### 14A - RPC Capability Discovery + Cache
- New `apps/api/src/vista/rpcCapabilities.ts`: Runtime RPC capability discovery engine with 5-min TTL cache. Probes 39 RPCs across 12 domains. Exports `discoverCapabilities()`, `requireRpc()`, `optionalRpc()`, `isRpcAvailable()`, `getCapabilities()`, `getDomainCapabilities()`.
- New `apps/api/src/routes/capabilities.ts`: `GET /vista/rpc-capabilities` endpoint with `?refresh=true` and `?domain=` filters. Returns per-domain availability summaries.
- `WORLDVISTA_EXPECTED_MISSING` list (15 RPCs) prevents false alarms on known sandbox gaps.

### 14B - WARN Gap Closure
- Modified `apps/api/src/routes/inbox.ts`: Replaced raw `rpcErrors` with structured `featureStatus` array using `optionalRpc()`. Status values: `available`, `expected-missing`, `error`. Backward-compat `rpcErrors` field retained.
- Result: 2 former WARNs (ORWORB UNSIG ORDERS, ORWORB FASTUSER) now report as INFO/expected-missing.

### 14C - Write-back Parity Upgrades
- New `apps/api/src/routes/write-backs.ts`: 6 write-back endpoints + 3 utility endpoints.
  - `POST /vista/orders/sign` - ORWDX SAVE or draft
  - `POST /vista/orders/release` - ORWDXA VERIFY or draft
  - `POST /vista/labs/ack` - ORWLRR ACK or draft
  - `POST /vista/consults/create` - ORQQCN2 or draft
  - `POST /vista/surgery/create` - always draft (no RPC available)
  - `POST /vista/problems/save` - ORQQPL ADD SAVE or draft
  - `GET /vista/drafts`, `GET /vista/drafts/stats`, `GET /vista/write-audit`
- Modified `apps/web/src/stores/data-cache.tsx`: `signOrder`, `releaseOrder` now async with API calls. Added `acknowledgeLabs`, `fetchCapabilities`, `capabilities` state.
- Modified `apps/web/src/components/cprs/panels/LabsPanel.tsx`: Server-side ack with mode display.

### 14D - Imaging Viewer Integration
- New `apps/api/src/routes/imaging.ts`: `GET /vista/imaging/status`, `GET /vista/imaging/report`. Plugin interface (`ImagingViewerPlugin`) for future imaging viewer integration.

### 14E - Documentation
- New prompt: `prompts/15-PHASE-14-PARITY-CLOSURE/15-01-Phase14A-Compat-Layer-IMPLEMENT.md`
- New prompt: `prompts/15-PHASE-14-PARITY-CLOSURE/15-02-Phase14A-Compat-Layer-VERIFY.md`
- New runbook: `docs/runbooks/cprs-parity-closure-phase14.md`
- New verifier: `scripts/verify-phase1-to-phase14-parity-closure.ps1`

### Infrastructure
- Modified `apps/api/src/index.ts`: Registered 3 new route plugins.
- Modified `scripts/verify-latest.ps1`: Points to Phase 14 verifier.

## How to Test Manually

```bash
# Start Docker sandbox
cd services/vista && docker compose --profile dev up -d

# Start API
pnpm -C apps/api dev

# Test capabilities
curl http://127.0.0.1:3001/vista/rpc-capabilities

# Test write-backs
curl -X POST http://127.0.0.1:3001/vista/orders/sign \
  -H 'Content-Type: application/json' \
  -d '{"dfn":"1","orderId":"test","orderName":"Test","signedBy":"PROVIDER"}'

# Test imaging
curl http://127.0.0.1:3001/vista/imaging/status

# Test inbox (should show featureStatus, not WARNs)
curl http://127.0.0.1:3001/vista/inbox

# Check drafts
curl http://127.0.0.1:3001/vista/drafts
curl http://127.0.0.1:3001/vista/drafts/stats
curl http://127.0.0.1:3001/vista/write-audit
```

## Verifier Output

```
PASS: 128
FAIL: 0
WARN: 0
INFO: 2
TOTAL: 130

*** ALL CHECKS PASSED - 0 WARN ***
(INFO items are documented expected-missing RPCs on this distro)
```

INFO items:
- ORWORB UNSIG ORDERS - expected-missing on WorldVistA Docker
- ORWORB FASTUSER - expected-missing on WorldVistA Docker

## Follow-ups
- Wire imaging plugin to an actual DICOM/VistA Imaging viewer when available
- Add persistent draft storage (database) to replace in-memory Map
- Implement full order dialog parameter mapping for ORWDX SAVE
- Add lab acknowledgement sync when ORWLRR ACK is available on distro
- Add consult RPC support when ORQQCN2 is available
