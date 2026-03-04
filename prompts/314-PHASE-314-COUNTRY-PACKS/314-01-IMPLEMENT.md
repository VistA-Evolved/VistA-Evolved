# Phase 314 — Country Packs (W13-P6)

## Objective

Create concrete country-pack JSON configs for US, PH, and GH markets, plus
a loader that validates, caches, and serves them via REST endpoints.

## Implementation Steps

1. Create `country-packs/US/values.json` — US pack (active, HIPAA, ICD-10-CM, X12)
2. Create `country-packs/PH/values.json` — PH pack (active, DPA_PH, ICD-10-WHO, PhilHealth)
3. Create `country-packs/GH/values.json` — GH pack (draft, DPA_GH, ICD-10-WHO, NHIA G-DRG)
4. Create README.md for each pack
5. Create `apps/api/src/platform/country-pack-loader.ts`:
   - Types matching COUNTRY_PACK_STANDARD.md schema
   - Full validation (frameworks, regions, code systems, modules, UI)
   - File-based loader with BOM stripping (BUG-064)
   - In-memory cache with 5-min TTL
   - `resolvePackForTenant()` for tenant provisioning
6. Create `apps/api/src/routes/country-pack-routes.ts` — 7 endpoints
7. Create prompts, evidence, verifier

## Files Touched

- `country-packs/US/values.json` (new)
- `country-packs/US/README.md` (new)
- `country-packs/PH/values.json` (new)
- `country-packs/PH/README.md` (new)
- `country-packs/GH/values.json` (new)
- `country-packs/GH/README.md` (new)
- `apps/api/src/platform/country-pack-loader.ts` (new)
- `apps/api/src/routes/country-pack-routes.ts` (new)

## Verification

See `314-99-VERIFY.md`
