# Phase 441 — IMPLEMENT: Multi-Country Config Layer (W28 P3)

## Goal
Bridge tenant-config.ts and country-pack-loader.ts with a persistent,
audited tenant→country mapping layer. Previously tenant→country lived
only as an in-memory Map with "default"→"US" in classification-engine.ts.

## Files Created
- `apps/api/src/regulatory/country-config.ts` — Tenant→country assignment store

## Files Modified
- `apps/api/src/regulatory/index.ts` — Re-exported country-config types + functions
- `apps/api/src/platform/store-policy.ts` — Registered 2 stores

## Key Decisions
- assignCountryToTenant() wires through to classification-engine.ts setTenantCountry()
- resolveTenantRegulatoryConfig() combines country + framework + pack availability
- Hash-chained audit trail for all assignment changes
- 3 supported countries initially (US, PH, GH) — extensible via addSupportedCountry()
- Regulatory constraint derivation from framework (consent model, retention, cross-border, breach notif)
