# 397-01-IMPLEMENT — Localization + Multi-Country Packs + Theming (W22-P9)

## User Request

Implement Phase 397: Localization + Multi-Country Packs + Theming as part of Wave 22 (Specialty Clinical Content + CDS + Deep VistA Writeback).

## Implementation Steps

1. Create `apps/api/src/localization/types.ts` — Full type system: LocaleDefinition (BCP 47), TranslationBundle (namespace-scoped, versioned), UcumUnitProfile + UnitConversion, CountryPack (ICD versions, formulary, clinical refs), ThemeDefinition (CSS custom properties, 6 categories, dark mode), ThemePreset, TenantLocaleConfig, LocalizationDashboardStats
2. Create `apps/api/src/localization/localization-store.ts` — 6 in-memory stores with seed data: 4 base locales (en-US, en-GB, fil-PH, es-MX), 2 UCUM unit profiles (US Conventional, SI Metric), 3 system themes (Legacy VistA, Modern Clinical, High Contrast WCAG AAA). Translation fallback chain: exact → base language → en-US.
3. Create `apps/api/src/localization/localization-routes.ts` — 32 REST endpoints covering locales CRUD, translation bundles CRUD + resolve with fallback, unit profiles list/create/get, country packs CRUD, themes CRUD with system protection, tenant locale config get/put, dashboard stats
4. Create `apps/api/src/localization/index.ts` — Barrel export as `localizationRoutes`
5. Wire into `register-routes.ts` — import + server.register(localizationRoutes)
6. Wire into `security.ts` — `/localization/` session auth rule
7. Wire into `store-policy.ts` — 6 entries: locales, translation-bundles, ucum-unit-profiles, country-packs, themes, tenant-locale-configs

## Files Touched

- `apps/api/src/localization/types.ts` (new)
- `apps/api/src/localization/localization-store.ts` (new)
- `apps/api/src/localization/localization-routes.ts` (new)
- `apps/api/src/localization/index.ts` (new)
- `apps/api/src/server/register-routes.ts` (modified)
- `apps/api/src/middleware/security.ts` (modified)
- `apps/api/src/platform/store-policy.ts` (modified)

## Verification

- `pnpm exec tsc --noEmit` — CLEAN
- 32 REST endpoints registered
- 6 in-memory stores tracked in store-policy
- Seed data: 4 locales, 2 unit profiles, 3 system themes
- Translation fallback chain: exact → base language → en-US
- System theme protection (can't modify/delete seeded themes)
- Per ADR-W22-THEMING: CSS custom properties, legacy/modern/high-contrast presets
