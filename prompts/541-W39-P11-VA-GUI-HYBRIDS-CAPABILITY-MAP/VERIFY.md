# Phase 541 — VERIFY — VA GUI Hybrids Capability Map

## Gates (12)

| #   | Gate                  | Check                                                                      |
| --- | --------------------- | -------------------------------------------------------------------------- |
| 1   | Builder script exists | `scripts/ui-estate/build-hybrids-map.mjs` present                          |
| 2   | Data file exists      | `data/ui-estate/va-gui-hybrids-map.json` present, valid JSON               |
| 3   | Hybrid count >= 24    | At least 24 VA system hybrids in map                                       |
| 4   | Per-hybrid fields     | Each hybrid has hostPlatform, deploymentModel, rpcOverlap, rpcGap          |
| 5   | RPC overlap computed  | At least 1 hybrid has rpcOverlap.length > 0                                |
| 6   | Migration readiness   | Each hybrid has migrationReadiness (0-100)                                 |
| 7   | Route file exists     | `apps/api/src/routes/hybrids/index.ts` present                             |
| 8   | Route exports plugin  | File exports `hybridsRoutes` as Fastify plugin                             |
| 9   | Route registered      | `register-routes.ts` imports and registers hybrids                         |
| 10  | Capabilities added    | `migration.hybrids.map` + `migration.hybrids.summary` in capabilities.json |
| 11  | Store policy          | `hybrids-map-cache` in store-policy.ts                                     |
| 12  | No PHI                | No SSN, DOB, patient names in generated data                               |
