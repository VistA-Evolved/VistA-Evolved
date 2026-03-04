# 406-01-IMPLEMENT — US Exchange Pack (TEFCA)

## Phase 406 (W23-P8)

### Goal

Implement the US-specific TEFCA exchange pack with SMART Health Links support.
Built-in pack profiles define standards, required/optional capabilities.
Connector CRUD manages external endpoint connections with auth config.

### Source Files (shared with P9)

- `apps/api/src/exchange-packs/types.ts` — ExchangePackProfile, ExchangeConnector, ExchangeTransaction
- `apps/api/src/exchange-packs/pack-store.ts` — Pack catalog, connector CRUD, transaction simulation
- `apps/api/src/exchange-packs/pack-routes.ts` — REST endpoints
- `apps/api/src/exchange-packs/index.ts` — Barrel export

### Built-in US Pack Profiles

- `us-tefca`: FHIR R4 + USCDI v3 + C-CDA 2.1 + SMART
- `us-smart`: SMART Health Links for portable clinical data
