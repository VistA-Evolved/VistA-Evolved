# 496-99-VERIFY — Retention + DSAR Workflows

## Gates

1. `retention-engine.ts` exports `validateRetention()` that reads pack config.
2. `dsar-store.ts` exports CRUD for DSAR requests with lifecycle transitions.
3. `/dsar/requests` POST creates a DSAR request enriched with pack rights.
4. `/dsar/requests` GET lists DSAR requests for a tenant.
5. `/dsar/requests/:id/fulfill` transitions to fulfilled.
6. Erasure DSAR blocked when pack.rightToErasure = false.
7. Export DSAR blocked when pack.dataPortability = false.
8. No PHI in audit entries.
9. TypeScript compiles clean.
