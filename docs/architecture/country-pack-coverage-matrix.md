# Country Pack Coverage Matrix

> **Phase 491 (W34-P1)** — Canonical reference for which `CountryPackValues`
> fields are runtime-enforced vs metadata-only. Updated as P2-P9 wire new
> fields to runtime behavior.

## Legend

| Status | Meaning |
|--------|---------|
| **Defined** | Field exists in `CountryPackValues` TypeScript type |
| **Loaded** | Field is read from `country-packs/<CC>/values.json` and cached |
| **Validated** | `validatePack()` in `country-pack-loader.ts` checks this field |
| **Routed** | A REST endpoint exposes or returns this field |
| **Enforced** | Used in a Fastify hook, middleware, or route logic to gate/alter behavior |
| **UI-bound** | Web or portal reads and displays/applies this field |

Status codes: Y = Yes, N = No, P = Partial

---

## Identity Fields

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `countryCode` | Y | Y | Y (2-letter ISO) | Y (GET /country-packs/:cc) | N | N | Used as key, not enforced at request time |
| `countryName` | Y | Y | Y (required) | Y | N | N | Display only |
| `packVersion` | Y | Y | Y (SemVer) | Y | N | N | Metadata |
| `status` | Y | Y | Y (draft/active/deprecated) | Y | P | N | `resolvePackForTenant()` rejects non-active, but not wired to request pipeline |
| `maintainer` | Y | Y | N | Y | N | N | Informational only |

## Locale & Timezone Fields

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `defaultLocale` | Y | Y | Y (required, in supportedLocales) | Y | N | N | **GAP**: Not wired to tenant config or i18n middleware |
| `defaultTimezone` | Y | Y | N | Y | N | N | **GAP**: Not used anywhere at request time |
| `supportedLocales` | Y | Y | Y (contains defaultLocale) | Y | N | N | **GAP**: Not used to validate session locale |

## Regulatory Profile

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `regulatoryProfile.framework` | Y | Y | Y (HIPAA/DPA_PH/DPA_GH) | Y (GET .../regulatory) | P | N | Framework registry has own copy; pack not authoritative at runtime |
| `regulatoryProfile.consentRequired` | Y | Y | N | Y | N | N | **GAP**: Consent engine doesn't read this from pack |
| `regulatoryProfile.consentGranularity` | Y | Y | Y (enum) | Y | N | N | **GAP**: Consent engine has own type, not linked to pack |
| `regulatoryProfile.dataExportRestricted` | Y | Y | N | Y | N | N | **GAP**: Export routes don't check this flag |
| `regulatoryProfile.requiresConsentForTransfer` | Y | Y | N | Y | P | N | data-residency-routes.ts has transfer validation, but doesn't read pack directly |
| `regulatoryProfile.retentionMinYears` | Y | Y | Y (>= 1) | Y | N | N | **GAP**: No retention enforcement reads this |
| `regulatoryProfile.retentionMaxYears` | Y | Y | N | Y | N | N | **GAP**: No max retention enforcement |
| `regulatoryProfile.breakGlassAllowed` | Y | Y | N | Y | N | N | **GAP**: Break-glass logic in imaging-authz.ts doesn't read pack |
| `regulatoryProfile.auditRetentionDays` | Y | Y | Y (>= 365) | Y | N | N | **GAP**: Audit shipping doesn't use this for TTL |
| `regulatoryProfile.rightToErasure` | Y | Y | N | Y | N | N | **GAP**: No erasure workflow exists yet |
| `regulatoryProfile.dataPortability` | Y | Y | N | Y | N | N | **GAP**: data-portability-routes.ts exists but doesn't read pack flag |

## Data Residency

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `dataResidency.region` | Y | Y | Y (enum) | Y | N | N | **GAP**: Not used to gate data writes or audit shipping |
| `dataResidency.crossBorderTransferAllowed` | Y | Y | N | Y | P | N | data-residency-routes.ts has validation but pack not the source of truth at runtime |
| `dataResidency.requiresConsentForTransfer` | Y | Y | N | Y | N | N | **GAP**: Not wired to consent check pipeline |
| `dataResidency.retentionMinYears` | Y | Y | N | Y | N | N | Duplicate of regulatoryProfile.retentionMinYears |

## Terminology

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `terminologyDefaults.diagnosisCodeSystem` | Y | Y | Y (enum) | Y (GET .../terminology) | N | N | terminology-registry.ts has own defaults, not reading pack |
| `terminologyDefaults.procedureCodeSystem` | Y | Y | Y (enum) | Y | N | N | Same gap |
| `terminologyDefaults.labCodeSystem` | Y | Y | Y (enum) | Y | N | N | Same gap |
| `terminologyDefaults.drugCodeSystem` | Y | Y | Y (enum) | Y | N | N | Same gap |

## Module & Feature Flags

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `payerModules` | Y | Y | N | Y | N | N | **GAP**: Not used by payer registry or RCM |
| `enabledModules` | Y | Y | Y (includes kernel) | Y (GET .../modules) | N | N | **GAP**: module-registry.ts uses SKU, not pack |
| `featureFlags` | Y | Y | N | Y | N | N | **GAP**: tenant-config featureFlags are independent |

## UI Defaults

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `uiDefaults.dateFormat` | Y | Y | N | Y | N | N | **GAP**: Not propagated to web/portal |
| `uiDefaults.timeFormat` | Y | Y | Y (12h/24h) | Y | N | N | **GAP**: Not propagated to web/portal |
| `uiDefaults.numberFormat` | Y | Y | N | Y | N | N | **GAP**: Not propagated |
| `uiDefaults.currencyCode` | Y | Y | Y (3-letter ISO) | Y | N | P | RCM uses hardcoded currency per payer |
| `uiDefaults.theme` | Y | Y | N | Y | N | N | theme-system has own config, not reading pack |
| `uiDefaults.rtlSupport` | Y | Y | N | Y | N | N | Not implemented |

## Reporting Requirements

| Field | Defined | Loaded | Validated | Routed | Enforced | UI-bound | Notes |
|-------|---------|--------|-----------|--------|----------|----------|-------|
| `reportingRequirements.qualityMeasures` | Y | Y | N | Y (GET .../regulatory) | N | N | quality-measures store is independent |
| `reportingRequirements.publicHealthReporting` | Y | Y | N | Y | N | N | Not connected |
| `reportingRequirements.claimFormats` | Y | Y | N | Y | N | N | RCM serializer chooses format by connector type |
| `reportingRequirements.remittanceFormats` | Y | Y | N | Y | N | N | Not connected |

---

## Summary

| Category | Total Fields | Defined | Loaded | Validated | Routed | Enforced | UI-bound |
|----------|-------------|---------|--------|-----------|--------|----------|----------|
| Identity | 5 | 5 | 5 | 4 | 5 | 1 (partial) | 0 |
| Locale/Timezone | 3 | 3 | 3 | 2 | 3 | 0 | 0 |
| Regulatory Profile | 11 | 11 | 11 | 4 | 11 | 1 (partial) | 0 |
| Data Residency | 4 | 4 | 4 | 1 | 4 | 1 (partial) | 0 |
| Terminology | 4 | 4 | 4 | 4 | 4 | 0 | 0 |
| Modules/Flags | 3 | 3 | 3 | 1 | 3 | 0 | 0 |
| UI Defaults | 6 | 6 | 6 | 2 | 6 | 0 | 0 (1 partial) |
| Reporting | 4 | 4 | 4 | 0 | 4 | 0 | 0 |
| **TOTAL** | **40** | **40** | **40** | **18** | **40** | **3 partial** | **0 (1 partial)** |

**Key finding**: All 40 fields are defined, loaded, and routed via REST endpoints.
Only 3 fields have partial enforcement. **Zero fields are fully enforced at
request time.** The country pack system is currently metadata-only infrastructure.

Wave 34 P2-P9 will systematically wire these fields to runtime behavior.

---

## Remediation Map (Wave 34 Phases)

| Phase | Fields Targeted | Enforcement Type |
|-------|----------------|------------------|
| P2 (Tenant Binding) | defaultLocale, defaultTimezone, countryCode | Tenant config binding |
| P3 (Runtime Policy Spine) | framework, consentGranularity, dateFormat, timeFormat, numberFormat, currencyCode | Request-scoped policy resolution |
| P4 (Consent + Privacy v2) | consentRequired, consentGranularity, requiresConsentForTransfer | Consent engine reads pack |
| P5 (Data Residency) | region, crossBorderTransferAllowed, dataExportRestricted | Write-time region locks |
| P6 (Retention + DSAR) | retentionMinYears, retentionMaxYears, auditRetentionDays, rightToErasure, dataPortability | Retention enforcement + DSAR |
| P7 (i18n Gate) | supportedLocales, defaultLocale | CI-time locale coverage check |
| P8 (UTF-8 Lane) | (none — VistA round-trip) | VistA M global encoding test |
| P9 (Conformance Runner) | All 40 fields | Automated per-pack validation |
