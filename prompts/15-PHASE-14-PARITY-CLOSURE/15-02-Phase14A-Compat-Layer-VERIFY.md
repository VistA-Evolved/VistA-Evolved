# Phase 14A — Compatibility Layer VERIFY

## Verification Checklist

### 14A — RPC Capability Discovery
- [ ] GET /vista/rpc-capabilities returns ok=true with structured data
- [ ] Response includes totalProbed, available, missing, expectedMissing
- [ ] ?refresh=true forces re-probe
- [ ] ?domain=orders returns filtered domain capabilities
- [ ] Cache TTL respected (default 5 min)
- [ ] rpcCapabilities.ts exports: discoverCapabilities, requireRpc, optionalRpc, isRpcAvailable, getCapabilities, getDomainCapabilities

### 14B — WARN Gap Closure
- [ ] GET /vista/inbox returns featureStatus array instead of rpcErrors
- [ ] featureStatus entries use 'expected-missing' (not WARN)
- [ ] Backward-compat rpcErrors field still present
- [ ] Phase 14 verifier produces 0 WARN

### 14C — Write-back Endpoints
- [ ] POST /vista/orders/sign returns { ok, mode: 'draft', draftId }
- [ ] POST /vista/orders/release returns { ok, mode: 'draft', draftId }
- [ ] POST /vista/labs/ack returns { ok, mode: 'draft', count }
- [ ] POST /vista/consults/create returns { ok, mode: 'draft', draftId }
- [ ] POST /vista/surgery/create returns { ok, mode: 'draft', draftId }
- [ ] POST /vista/problems/save returns { ok, mode: 'draft', draftId }
- [ ] GET /vista/drafts returns stored drafts
- [ ] GET /vista/drafts/stats returns count summary
- [ ] GET /vista/write-audit returns audit entries

### 14D — Imaging
- [ ] GET /vista/imaging/status returns viewer enabled/disabled state
- [ ] GET /vista/imaging/report returns structured response
- [ ] Plugin interface documented

### 14E — Documentation
- [ ] prompts/15-PHASE-14-PARITY-CLOSURE/ exists with IMPLEMENT + VERIFY
- [ ] docs/runbooks/cprs-parity-closure-phase14.md exists
- [ ] Verifier script created and 0 WARN

### Acceptance Criteria
- Phase 14 verifier: 0 FAIL, 0 WARN
- /vista/rpc-capabilities is called by verifier
- known-gaps documentation updated
- All write-backs use server-side drafts (not purely client-local)
