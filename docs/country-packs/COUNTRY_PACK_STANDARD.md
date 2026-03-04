# Country Pack Standard

> Defines what constitutes a "country pack" in VistA-Evolved and the schema
> that all packs must follow.

## Overview

A **country pack** is a declarative configuration bundle that adapts
VistA-Evolved for deployment in a specific country or jurisdiction. It
activates the right combination of:

- Locale and timezone defaults
- Regulatory profile (consent, retention, export controls)
- Terminology code system defaults
- Payer ecosystem modules
- Module enablement (which product modules are active)
- UI formatting preferences
- Reporting requirements
- Data residency region assignment

Country packs are **values-driven** (see ADR-country-pack-model.md) — they
are JSON configuration files, not code branches.

## Directory Structure

```
country-packs/
  <ISO-3166-alpha-2>/
    values.json       ← Required: pack definition (schema-validated)
    README.md         ← Required: human-readable description
    checklist.md      ← Required: verification checklist for this market
```

## values.json Schema

```jsonc
{
  // ── Identity ──────────────────────────────────────────
  "countryCode": "US", // Required. ISO 3166-1 alpha-2
  "countryName": "United States", // Required. English display name
  "packVersion": "1.0.0", // Required. SemVer
  "status": "active", // "draft" | "active" | "deprecated"
  "maintainer": "VistA-Evolved Core Team",

  // ── Locale ────────────────────────────────────────────
  "defaultLocale": "en-US", // BCP 47 locale tag
  "defaultTimezone": "America/New_York", // IANA timezone
  "supportedLocales": ["en-US", "es-US"], // All supported locales

  // ── Regulatory Profile ────────────────────────────────
  "regulatoryProfile": {
    "framework": "HIPAA", // Primary regulatory framework
    "consentRequired": true, // Patient consent before data sharing
    "consentGranularity": "category", // "all-or-nothing" | "category" | "item"
    "dataExportRestricted": false, // Cross-border data export blocked?
    "requiresConsentForTransfer": true, // Consent needed for cross-border?
    "retentionMinYears": 7, // Minimum record retention
    "retentionMaxYears": null, // null = no upper bound
    "breakGlassAllowed": true, // Emergency access override
    "auditRetentionDays": 2555, // ~7 years
    "rightToErasure": false, // GDPR Article 17 (future)
    "dataPortability": false, // GDPR Article 20 (future)
  },

  // ── Data Residency ────────────────────────────────────
  "dataResidency": {
    "region": "us-east", // DataRegion label
    "crossBorderTransferAllowed": false,
    "requiresConsentForTransfer": true,
    "retentionMinYears": 7,
  },

  // ── Terminology ───────────────────────────────────────
  "terminologyDefaults": {
    "diagnosisCodeSystem": "ICD-10-CM",
    "procedureCodeSystem": "CPT",
    "labCodeSystem": "LOINC",
    "drugCodeSystem": "NDC",
  },
  "terminologyOverrides": {}, // Optional per-domain overrides

  // ── Payer Ecosystem ───────────────────────────────────
  "payerModules": ["us_core"], // refs to data/payers/*.json

  // ── Module Enablement ─────────────────────────────────
  "enabledModules": [
    // Phase 37C module IDs
    "kernel",
    "clinical",
    "portal",
    "telehealth",
    "imaging",
    "analytics",
    "interop",
    "rcm",
    "scheduling",
  ],
  "featureFlags": {
    // Phase 109 feature flags
    "telehealth_recording": false,
    "ai_intake_llm": false,
  },

  // ── UI Defaults ───────────────────────────────────────
  "uiDefaults": {
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "numberFormat": "en-US",
    "currencyCode": "USD",
    "theme": "default",
    "rtlSupport": false,
  },

  // ── Reporting ─────────────────────────────────────────
  "reportingRequirements": ["cms_quality_reporting", "meaningful_use"],
}
```

## Schema Rules

| Field                                  | Constraint                                      |
| -------------------------------------- | ----------------------------------------------- |
| `countryCode`                          | Must be valid ISO 3166-1 alpha-2                |
| `packVersion`                          | Must follow SemVer (major.minor.patch)          |
| `status`                               | Only `"active"` packs are used at runtime       |
| `defaultLocale`                        | Must be in `supportedLocales` array             |
| `defaultTimezone`                      | Must be valid IANA timezone                     |
| `regulatoryProfile.retentionMinYears`  | ≥ 1                                             |
| `regulatoryProfile.auditRetentionDays` | ≥ 365                                           |
| `dataResidency.region`                 | Must match a configured DataRegion              |
| `enabledModules`                       | Must always include `"kernel"`                  |
| `payerModules`                         | Must reference existing files in `data/payers/` |

## Pack Lifecycle

1. **Draft** — pack is being developed, not available for tenant provisioning
2. **Active** — pack is validated and available for production use
3. **Deprecated** — pack is superseded by a newer version, existing tenants
   continue, new tenants cannot select it

## Tenant Provisioning Flow

```
1. Admin selects country pack (e.g., "US")
2. System loads country-packs/US/values.json
3. Tenant is created with:
   - dataRegion = pack.dataResidency.region (immutable)
   - modules = pack.enabledModules
   - feature flags = pack.featureFlags
   - terminology defaults = pack.terminologyDefaults
   - regulatory profile = pack.regulatoryProfile (locked)
4. Admin can override modules and feature flags (but not regulatory profile)
```

## Regulatory Lock

The `regulatoryProfile` section is **locked** after tenant creation:

- Tenant admins cannot weaken consent requirements
- Retention minimums cannot be reduced
- Break-glass policy follows the country's regulatory framework
- Only platform admins can update regulatory profiles (via pack version bump)

## Validation

Country packs are validated at:

1. **Build time** — schema validation in CI
2. **Startup time** — pack loader validates all active packs
3. **Provisioning time** — full validation before tenant creation

## Adding a New Country

1. Create `country-packs/<CC>/values.json` following the schema
2. Create `country-packs/<CC>/README.md` with market context
3. Create `country-packs/<CC>/checklist.md` with verification gates
4. Add payer seed data to `data/payers/<market>.json` if needed
5. Add terminology resolver if country uses non-standard codes
6. Run the country pack verifier: `scripts/verify-country-pack.ps1 -Country <CC>`

## Related

- ADR-country-pack-model.md — Architectural decision
- ADR-data-residency-model.md — Region routing
- ADR-terminology-model.md — Terminology pluggability
- Phase 37C: Module registry, SKU profiles
- Phase 38: Payer registry, payer seed data
- Phase 109: DB-backed module entitlements, feature flags
