# Phase 14A — Compatibility Layer IMPLEMENT

## User Request
Implement a VistA Compatibility Layer with RPC capability discovery, runtime
availability checks, and structured fallback behavior for missing RPCs.

## Implementation Steps

### 14A — RPC Capability Discovery + Cache
1. Create `apps/api/src/vista/rpcCapabilities.ts`:
   - `discoverCapabilities()` — probes all known RPCs against VistA
   - `requireRpc(name)` — throws structured error if unavailable
   - `optionalRpc(name)` — returns availability + fallback info
   - `isRpcAvailable()`, `getCapabilities()`, `getDomainCapabilities()`
   - Cache with configurable TTL (VISTA_CAPABILITY_TTL_MS, default 5min)
   - Known expected-missing list for WorldVistA Docker sandbox

2. Create `apps/api/src/routes/capabilities.ts`:
   - GET /vista/rpc-capabilities — returns full capability map
   - ?refresh=true — force re-probe
   - ?domain=orders — filter by domain
   - Response includes: totalProbed, available, missing, expectedMissing, unexpectedMissing

### 14B — Close 2 WARN RPC Gaps
3. Update `apps/api/src/routes/inbox.ts`:
   - Import `optionalRpc` from capability layer
   - Check capability before calling ORWORB UNSIG ORDERS / ORWORB FASTUSER
   - Replace `rpcErrors` with `featureStatus` array (available / expected-missing / error)
   - Maintain backward-compat `rpcErrors` field for Phase 13 verifier

### 14C — Write-back Parity Upgrades
4. Create `apps/api/src/routes/write-backs.ts`:
   - POST /vista/orders/sign — ORWDX SAVE or server-side draft
   - POST /vista/orders/release — ORWDXA VERIFY or server-side draft
   - POST /vista/labs/ack — ORWLRR ACK or server-side draft
   - POST /vista/consults/create — ORQQCN2 or draft
   - POST /vista/surgery/create — always draft (no standard write-back RPC)
   - POST /vista/problems/save — ORQQPL ADD/EDIT SAVE or draft
   - GET /vista/drafts — list pending server-side drafts
   - GET /vista/drafts/stats — draft statistics
   - GET /vista/write-audit — write-back audit trail
   - In-memory ServerDraft store with audit logging

5. Update `apps/web/src/stores/data-cache.tsx`:
   - `signOrder()` → async, calls POST /vista/orders/sign, returns { mode, draftId }
   - `releaseOrder()` → async, calls POST /vista/orders/release
   - Add `acknowledgeLabs()` → POST /vista/labs/ack
   - Add `fetchCapabilities()` → GET /vista/rpc-capabilities
   - Add `capabilities` state field

6. Update `apps/web/src/components/cprs/panels/LabsPanel.tsx`:
   - Wire handleAcknowledge + handleAcknowledgeAll to `acknowledgeLabs()`
   - Show ack mode (synced / server-side / local) in status message

### 14D — Imaging Viewer Integration
7. Create `apps/api/src/routes/imaging.ts`:
   - GET /vista/imaging/status — viewer enabled/disabled + capability detection
   - GET /vista/imaging/report — radiology report (if RA DETAILED REPORT available)
   - Plugin interface: ImagingViewerPlugin for future integrations

8. Register all new routes in `apps/api/src/index.ts`

### 14E — Documentation
9. Create prompts/15-PHASE-14-PARITY-CLOSURE/
10. Create docs/runbooks/cprs-parity-closure-phase14.md
11. Update known-gaps documentation

### 14F — Verifier Script
12. Create scripts/verify-phase1-to-phase14-parity-closure.ps1
13. Update scripts/verify-latest.ps1
14. Achieve 0 WARN on WorldVistA sandbox

## Verification Steps
- Run scripts/verify-phase1-to-phase14-parity-closure.ps1
- All PASS, 0 WARN, 0 FAIL
- GET /vista/rpc-capabilities returns structured map
- POST /vista/orders/sign returns { mode: 'draft', draftId: ... }
- POST /vista/labs/ack returns { mode: 'draft', ... }
- GET /vista/drafts returns pending drafts
- GET /vista/imaging/status shows viewer state

## Files Touched
- apps/api/src/vista/rpcCapabilities.ts (NEW)
- apps/api/src/routes/capabilities.ts (NEW)
- apps/api/src/routes/write-backs.ts (NEW)
- apps/api/src/routes/imaging.ts (NEW)
- apps/api/src/routes/inbox.ts (MODIFIED)
- apps/api/src/index.ts (MODIFIED)
- apps/web/src/stores/data-cache.tsx (MODIFIED)
- apps/web/src/components/cprs/panels/LabsPanel.tsx (MODIFIED)
- scripts/verify-phase1-to-phase14-parity-closure.ps1 (NEW)
- scripts/verify-latest.ps1 (MODIFIED)
- docs/runbooks/cprs-parity-closure-phase14.md (NEW)
- prompts/15-PHASE-14-PARITY-CLOSURE/* (NEW)
