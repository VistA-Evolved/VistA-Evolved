# Runbook: CPRS Parity Closure — Phase 14

## Overview
Phase 14 introduces the VistA Compatibility Layer that detects RPC availability
at runtime and provides structured fallback behavior. This eliminates WARNs
from the verifier for known sandbox-missing RPCs and enables write-back
operations with server-side draft storage.

## Architecture

### RPC Capability Discovery
```
Client → GET /vista/rpc-capabilities → API → VistA (probe each RPC)
                                        ↓
                                   Cache (5min TTL)
                                        ↓
                              { rpcs: { "ORWPT LIST ALL": { available: true }, ... } }
```

### Write-back Flow
```
Client → POST /vista/orders/sign → API
                                    ↓
                         optionalRpc("ORWDX SAVE")
                              ↙          ↘
                        available?      not available?
                           ↓                 ↓
                     callRpc()        createDraft()
                           ↓                 ↓
                     { mode: "real" }  { mode: "draft", syncPending: true }
```

## New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /vista/rpc-capabilities | RPC availability map |
| POST | /vista/orders/sign | Sign order (real or draft) |
| POST | /vista/orders/release | Release signed order |
| POST | /vista/labs/ack | Acknowledge lab result |
| POST | /vista/consults/create | Create consult request |
| POST | /vista/surgery/create | Create surgery record |
| POST | /vista/problems/save | Add/edit problem |
| GET | /vista/drafts | List pending server-side drafts |
| GET | /vista/drafts/stats | Draft count summary |
| GET | /vista/write-audit | Write-back audit trail |
| GET | /vista/imaging/status | Imaging viewer availability |
| GET | /vista/imaging/report | Radiology report text |

## New Files

| File | Purpose |
|------|---------|
| apps/api/src/vista/rpcCapabilities.ts | Capability discovery engine + cache |
| apps/api/src/routes/capabilities.ts | GET /vista/rpc-capabilities route |
| apps/api/src/routes/write-backs.ts | Write-back endpoints + draft store |
| apps/api/src/routes/imaging.ts | Imaging viewer integration |

## Modified Files

| File | Change |
|------|--------|
| apps/api/src/index.ts | Import + register new route plugins |
| apps/api/src/routes/inbox.ts | Use capability layer for inbox RPCs |
| apps/web/src/stores/data-cache.tsx | Wire signOrder/releaseOrder/ackLabs to API |
| apps/web/src/components/cprs/panels/LabsPanel.tsx | Server-side ack |

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| VISTA_CAPABILITY_TTL_MS | 300000 | Cache TTL for RPC capabilities (ms) |

## Verification

```powershell
.\scripts\verify-phase1-to-phase14-parity-closure.ps1
```

Expected: All PASS, 0 WARN, 0 FAIL.

## Manual Testing

```powershell
# 1. Check capabilities
curl http://127.0.0.1:3001/vista/rpc-capabilities

# 2. Test order signing (will use draft mode on WorldVistA)
$body = '{"dfn":"1","orderId":"test-1","signedBy":"PROVIDER"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/vista/orders/sign -Method POST -Body $body -ContentType "application/json"

# 3. Check drafts
curl http://127.0.0.1:3001/vista/drafts

# 4. Check imaging status
curl http://127.0.0.1:3001/vista/imaging/status
```

## Known Gaps (Post-Phase 14)

These items remain in the "missing in distro" category—they require RPCs
not present in the WorldVistA Docker sandbox and cannot be simulated:

1. **Encounter management** — ORWPCE SAVE (requires encounter framework)
2. **Full order dialog** — ORWDX SAVE (requires order dialog IEN setup)
3. **Remote facility data** — ORWCIRN FACILITIES (single-facility sandbox)
4. **VistA Imaging gateway** — MAG4 REMOTE PROCEDURE (VistA Imaging not installed)
5. **Lab charting** — ORWLRR CHART (not available on sandbox)

All gaps have structured fallbacks and are documented in the capability map.
