# Phase 327 -- W15-P1: Manifest + Multi-Region ADRs

## Goal
Lock all multi-region architectural decisions before building, with rollback plans.

## Steps
1. Computed BASE_PHASE = 327 from max prompts prefix (326) + 1
2. Created `/prompts/WAVE_15_MANIFEST.md` mapping W15-P1..P10 to phases 327-336
3. Created 5 ADRs under `/docs/adrs/`:
   - ADR-TENANT-SHARDING.md -- Per-region DB cluster (chosen) vs per-tenant DB vs shared+RLS
   - ADR-GLOBAL-ROUTING.md -- Per-region ingress with DNS (chosen) vs global LB vs service mesh
   - ADR-MULTI-REGION-POSTGRES.md -- Active-passive streaming replication (chosen) vs logical vs active-active
   - ADR-VISTA-PLACEMENT.md -- VistA per tenant per region (chosen) vs shared VistA vs centralized
   - ADR-COST-ATTRIBUTION.md -- OpenCost (chosen) vs custom pipeline vs cloud-native
4. Each ADR includes: options, decision, operational risks, data residency constraints, rollback plan
5. Evidence: prompts scan output + ADR file listing

## Files Created
- `prompts/WAVE_15_MANIFEST.md`
- `docs/adrs/ADR-TENANT-SHARDING.md`
- `docs/adrs/ADR-GLOBAL-ROUTING.md`
- `docs/adrs/ADR-MULTI-REGION-POSTGRES.md`
- `docs/adrs/ADR-VISTA-PLACEMENT.md`
- `docs/adrs/ADR-COST-ATTRIBUTION.md`
