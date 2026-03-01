# Phase 314 — Country Packs — Evidence

## Pack Inventory

| Country | File | Status | Framework | Region | DX Code | Payer Module | Modules |
|---------|------|--------|-----------|--------|---------|--------------|---------|
| US | country-packs/US/values.json | active | HIPAA | us-east | ICD-10-CM | us_core | 13 |
| PH | country-packs/PH/values.json | active | DPA_PH | ph-mnl | ICD-10-WHO | ph_hmos | 10 |
| GH | country-packs/GH/values.json | draft | DPA_GH | gh-acc | ICD-10-WHO | (none) | 8 |

## Schema Compliance

All three packs follow the COUNTRY_PACK_STANDARD.md schema with all required
top-level fields: countryCode, countryName, packVersion, status, maintainer,
defaultLocale, defaultTimezone, supportedLocales, regulatoryProfile,
dataResidency, terminologyDefaults, payerModules, enabledModules,
featureFlags, uiDefaults, reportingRequirements.

## Validation Cross-Check

| Check | US | PH | GH |
|-------|----|----|-----|
| countryCode 2-letter | US | PH | GH |
| packVersion SemVer | 1.0.0 | 1.0.0 | 0.1.0 |
| framework valid | HIPAA | DPA_PH | DPA_GH |
| region valid | us-east | ph-mnl | gh-acc |
| kernel in modules | yes | yes | yes |
| defaultLocale in supported | en in [en,es] | fil in [fil,en] | en in [en] |
| retentionMinYears >= 1 | 6 | 5 | 5 |
| auditRetentionDays >= 365 | 2190 | 1825 | 1825 |
| currencyCode 3-letter | USD | PHP | GHS |

## Loader Features

- `loadCountryPack(cc)` — single pack from disk
- `loadAllCountryPacks()` — all packs from country-packs/ directory
- `getActiveCountryPacks()` — only active + valid packs
- `getCountryPack(cc)` — cached lookup with 5-min TTL
- `listCountryPacks()` — summary list
- `resolvePackForTenant(cc)` — effective config with error reporting
- `validatePack(pack)` — exhaustive field validation

## Route Inventory

| Method | Path | Description |
|--------|------|-------------|
| GET | /country-packs | List all packs |
| GET | /country-packs/:cc | Full pack detail |
| GET | /country-packs/:cc/validate | Validation report |
| GET | /country-packs/:cc/resolve | Tenant resolution |
| GET | /country-packs/:cc/modules | Module list + flags |
| GET | /country-packs/:cc/terminology | Terminology defaults |
| GET | /country-packs/:cc/regulatory | Regulatory + residency |
