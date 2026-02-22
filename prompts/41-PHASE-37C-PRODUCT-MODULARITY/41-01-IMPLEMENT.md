# Phase 37C — Productization & Modular Architecture

## User Request
Implement formal module boundaries, adapter interfaces, capability registry,
SKU deploy profiles, and module toggle enforcement so VistA-Evolved can be
sold as modular SKUs (Full Suite, CPRS-only, Portal-only, Telehealth-only,
RCM-only, Imaging-only, Interop-only).

## Implementation Steps
1. Create architecture doc: `docs/architecture/product-modularity-v1.md`
2. Create machine-readable manifests: `config/modules.json`, `config/skus.json`
3. Create capability registry: `config/capabilities.json` + server-side service
4. Create adapter interfaces + VistA + Stub implementations
5. Implement module toggle enforcement (API middleware + UI)
6. Define SKU deploy profiles (docker-compose + env flags)
7. Create verifier script: `scripts/verify-phase37c-modularity.ps1`
8. Create ops artifacts and runbook

## Verification
- `scripts/verify-phase37c-modularity.ps1` — all gates PASS
- Module disable returns 404 on disabled routes
- Adapter swap uses stub without crashing
- Capability registry drives UI enablement

## Files Touched
- prompts/41-PHASE-37C-PRODUCT-MODULARITY/IMPLEMENT.md
- docs/architecture/product-modularity-v1.md
- config/modules.json, config/skus.json, config/capabilities.json
- apps/api/src/modules/ (module-registry, capability-service, adapter-loader)
- apps/api/src/adapters/ (interfaces + vista + stub implementations)
- apps/api/src/middleware/module-guard.ts
- scripts/verify-phase37c-modularity.ps1
- docs/runbooks/phase37c-modularity.md
- ops/phase37c-summary.md, ops/phase37c-notion-update.json
