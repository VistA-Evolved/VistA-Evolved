# ADR: Country Pack Model

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Wave 13 Phase 309 (Regulatory/Compliance + Multi-Country Packaging)

## Decision

**Use values-driven country packs** — each country pack is a declarative JSON
configuration file, not a separate code branch or plugin binary.

## Context

VistA-Evolved must support deployment to multiple countries with different:
- Regulatory requirements (consent, data retention, export controls)
- Terminology systems (ICD-10-CM vs ICD-10-AM, LOINC vs local lab codes)
- Payer ecosystems (US commercial, PhilHealth, NHIA Ghana)
- Locale/timezone defaults
- UI theming and layout preferences
- Reporting obligations

### Options Considered

1. **Values-driven packs** — JSON config files per country that configure the
   existing modular system (feature flags, payer registry, terminology defaults)
2. **Code-driven plugins** — separate npm packages per country with custom code
3. **Branch-per-country** — maintain separate Git branches per deployment target

## Rationale

| Criterion           | Values-driven | Code plugins | Branch-per-country |
|---------------------|:---:|:---:|:---:|
| Maintenance cost    | Low | Medium | Very High |
| Feature drift risk  | None | Low | Critical |
| Runtime switchable  | Yes | Partial | No |
| Testable in CI      | Yes | Yes | Exponential |
| Tenant isolation    | Native | Requires loader | None |

- **Values-driven is the clear winner** for our architecture because:
  - Phase 37C already has `module-registry.ts` with SKU profiles and per-tenant overrides.
  - Phase 38 already has `data/payers/*.json` for market-specific payer catalogs.
  - Phase 109 has DB-backed module entitlements with feature flags.
  - Phase 285 has pluggable feature flag providers.
- The pack is a "meta-config" that activates the right combination of existing toggles.
- Country packs are just data; the system interprets them.

## Structure

```
country-packs/<iso-3166-alpha2>/
  values.json       ← Pack definition (schema-validated)
  README.md         ← Human-readable description
  checklist.md      ← Verification checklist for this market
```

### values.json Schema

```jsonc
{
  "countryCode": "US",               // ISO 3166-1 alpha-2
  "countryName": "United States",
  "defaultLocale": "en-US",
  "defaultTimezone": "America/New_York",
  "supportedLocales": ["en-US", "es-US"],
  "regulatoryProfile": {
    "consentRequired": true,          // Patient consent before data sharing
    "dataExportRestricted": false,    // Cross-border data export allowed?
    "retentionMinYears": 7,           // Minimum record retention
    "retentionMaxYears": null,        // null = no upper bound
    "breakGlassAllowed": true,        // Emergency access override
    "auditRetentionDays": 2555       // ~7 years
  },
  "terminologyDefaults": {
    "diagnosisCodeSystem": "ICD-10-CM",
    "procedureCodeSystem": "CPT",
    "labCodeSystem": "LOINC",
    "drugCodeSystem": "NDC"
  },
  "payerModules": ["us_core"],        // refs to data/payers/*.json files
  "enabledModules": [                  // Phase 37C module IDs to enable
    "kernel", "clinical", "portal", "telehealth",
    "imaging", "analytics", "interop", "rcm", "scheduling"
  ],
  "uiDefaults": {
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "numberFormat": "en-US",
    "currencyCode": "USD",
    "theme": "default"
  },
  "reportingRequirements": [
    "cms_quality_reporting",
    "meaningful_use"
  ]
}
```

## Consequences

- Tenant provisioning takes a `countryPackId` parameter.
- System applies pack defaults at tenant creation, then tenant admin can override.
- Regulatory fields (consent, retention) are locked — tenant cannot weaken them.
- New country = new JSON file + payer seed data + terminology mappings.
- No code changes required for new markets (unless new adapter needed).

## Related

- Phase 37C: Module registry, SKU profiles, capability service
- Phase 38: Payer registry, payer seed data
- Phase 109: DB-backed module entitlements, feature flags
- ADR-data-residency-model.md
- ADR-terminology-model.md
