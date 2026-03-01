# Phase 314 — Notes — Country Packs

## Design Decisions

1. **JSON config, not code branches** — Each country is a `values.json` file,
   not a separate module or build target. This follows ADR-country-pack-model.md.

2. **GH is draft status** — Ghana pack uses `"status": "draft"` because the
   gh-acc region is "planned" in data-residency.ts and no payer seed file exists.
   The loader excludes draft packs from `getActiveCountryPacks()`.

3. **Validation is exhaustive** — The loader validates every field against the
   known enum values from consent-engine, terminology-registry, and data-residency.
   Invalid packs are loaded but flagged with validationErrors.

4. **BOM stripping** — `loadCountryPack()` strips BOM per BUG-064 because
   any PowerShell-generated JSON will have it.

5. **Cache TTL** — 5-minute cache matches the RPC capability cache TTL convention.
   Packs change rarely; cache prevents re-reading disk on every request.

6. **enabledModules subset** — PH excludes imaging/fhir/ai/migration (not yet
   deployed in PH market). GH has only 8 core modules. This maps directly to
   the Phase 37C module guard enforcement.

7. **payerModules** — References payer seed file basenames from data/payers/.
   US=us_core (12 payers), PH=ph_hmos (15 payers), GH=[] (no seed yet).

## Cross-References

- ADR: docs/adrs/ADR-country-pack-model.md
- Schema: docs/country-packs/COUNTRY_PACK_STANDARD.md
- Consent profiles: apps/api/src/services/consent-engine.ts
- Terminology defaults: apps/api/src/services/terminology-registry.ts
- Data regions: apps/api/src/platform/data-residency.ts
- Module IDs: config/modules.json
