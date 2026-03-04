# Phase 441 — VERIFY: Multi-Country Config Layer (W28 P3)

## Gates

1. `country-config.ts` exists in `apps/api/src/regulatory/`
2. Exports: assignCountryToTenant, getTenantCountryAssignment, listTenantCountryAssignments,
   clearTenantCountry, resolveTenantRegulatoryConfig, getSupportedCountries
3. Wires through to classification-engine setTenantCountry() on assign
4. Hash-chained audit trail with verifyCountryAuditChain()
5. Store-policy entries registered (tenant-country-assignments, country-assignment-audit)
6. Barrel re-export from regulatory/index.ts
7. QA lint: 0 FAIL
