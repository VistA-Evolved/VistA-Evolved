# Country Pack Enforcement Gaps — Analysis & Remediation Plan

> **Phase 491 (W34-P1)** — Documents every gap between country pack field
> definitions and actual runtime enforcement. Serves as the work backlog
> for Wave 34 P2-P9.

---

## Executive Summary

The country pack system (Phase 314) provides a comprehensive type system
with 40 fields across 8 categories, complete validation, file-based loading,
and REST endpoints. However, **no field is fully runtime-enforced**. The
system is effectively metadata infrastructure — values are stored and queryable
but do not influence application behavior at request time.

This gap analysis identifies 7 enforcement gap categories and maps each to
the Wave 34 phase responsible for remediation.

---

## Gap 1: Tenant Config Lacks Country Pack Binding

**Current state**: `TenantConfig` (Phase 275) has no `countryPackId`, `locale`,
or `timezone` fields. There is no way to associate a tenant with a country pack
at the platform level.

**Impact**: All pack-based policy resolution requires manual country code
specification in API calls (e.g., `GET /country-packs/US/resolve`). No
automatic resolution at request time.

**Remediation**: P2 (Phase 492) — Add `countryPackId`, `locale`, `timezone`
to `TenantConfig` interface, PG migration, DB repo update, and resolve at
session creation / request time.

**Files affected**:
- `apps/api/src/config/tenant-config.ts` — add fields to TenantConfig interface
- `apps/api/src/platform/db/repo/tenant-config-repo.ts` — DB column mapping
- `apps/api/src/platform/db/migrate.ts` — ALTER TABLE migration

---

## Gap 2: No Request-Scoped Policy Resolution

**Current state**: Country pack values are loaded and cached, but there is no
Fastify hook or decorator that resolves the effective policy (locale, date
format, consent mode, terminology) for each incoming request based on the
tenant's country pack.

**Impact**: Every subsystem (consent, terminology, reporting) maintains its
own hardcoded defaults rather than using the pack as the single source of truth.

**Remediation**: P3 (Phase 493) — Create a Fastify `onRequest` hook that:
1. Reads `session.tenantId` → `TenantConfig.countryPackId`
2. Resolves `getCountryPack(countryPackId)` → `CountryPackValues`
3. Decorates `request.countryPolicy` with effective values (merged pack + tenant overrides)

**Files affected**:
- `apps/api/src/middleware/country-policy-hook.ts` — new file
- `apps/api/src/server/register-routes.ts` — register the hook

---

## Gap 3: Consent Engine Disconnected from Pack Regulatory Profile

**Current state**: The consent engine (Phase 312) defines `ConsentGranularity`
and `ConsentCategory` independently. The pack's `regulatoryProfile.consentRequired`,
`consentGranularity`, and `requiresConsentForTransfer` are stored but never
read by the consent engine.

**Impact**: Consent behavior is identical regardless of country pack. A
PH tenant (all-or-nothing consent required by DPA) gets the same consent
flow as a US tenant (category-level consent under HIPAA).

**Remediation**: P4 (Phase 494) — Wire consent engine to read pack regulatory
profile. Consent UX adapts: all-or-nothing shows a single toggle; category
shows per-category toggles; item-level shows granular controls.

**Files affected**:
- `apps/api/src/services/consent-engine.ts` — accept pack profile parameter
- `apps/api/src/routes/consent-routes.ts` — read pack from request context
- `apps/api/src/consent-pou/consent-routes.ts` — same

---

## Gap 4: Data Residency Not Enforced on Writes or Exports

**Current state**: `data-residency-routes.ts` has cross-border transfer
validation functions, but they don't read the pack's `dataResidency` config
as the source of truth. The `dataExportRestricted` flag is never checked.

**Impact**: Data can be exported or shipped to S3 buckets in any region
regardless of the pack's residency constraints.

**Remediation**: P5 (Phase 495) — Gate data writes, audit shipping, and
FHIR exports against the pack's `dataResidency.region` and
`crossBorderTransferAllowed` flag.

**Files affected**:
- `apps/api/src/routes/data-residency-routes.ts` — read pack config
- `apps/api/src/audit-shipping/shipper.ts` — validate bucket region vs pack region
- `apps/api/src/routes/data-portability-routes.ts` — check dataExportRestricted

---

## Gap 5: No Retention Enforcement or DSAR Workflows

**Current state**: Pack defines `retentionMinYears`, `retentionMaxYears`,
`auditRetentionDays`, `rightToErasure`, and `dataPortability`. None of these
are enforced. There is no DSAR (Data Subject Access Request) workflow.

**Impact**: Records can be deleted before the minimum retention period. No
mechanism for patients to request data access, export, or erasure per GDPR/DPA
requirements.

**Remediation**: P6 (Phase 496) — Implement:
1. Retention policy enforcement (soft-delete gating based on pack retention min/max)
2. DSAR request API (submit, track, fulfill access/erasure requests)
3. Audit retention enforcement using `auditRetentionDays`

**Files affected**:
- `apps/api/src/services/retention-engine.ts` — new file
- `apps/api/src/routes/dsar-routes.ts` — new file
- `apps/api/src/audit-shipping/shipper.ts` — respect auditRetentionDays

---

## Gap 6: i18n Not Validated Against Pack Supported Locales

**Current state**: The i18n system (Phase 132) supports 3 locales (en, fil, es)
with message bundles in `apps/portal/public/messages/`. The pack defines
`supportedLocales` but no validation exists to ensure that all pack-required
locales have complete message coverage.

**Impact**: A GH pack claiming to support locale `en` has no guarantee that
all UI strings exist. Missing translations silently fall back to English keys.

**Remediation**: P7 (Phase 497) — CI-time gate that:
1. Reads each pack's `supportedLocales`
2. For each locale, checks that a message bundle exists and all base (en) keys
   are present
3. Reports coverage percentage per locale per pack

**Files affected**:
- `scripts/qa-gates/i18n-coverage-gate.mjs` — new file
- `qa/gauntlet/cli.mjs` — add i18n gate to RC suite

---

## Gap 7: VistA M Globals Not Tested for UTF-8 Round-Trip

**Current state**: VistA M stores strings in ISO-8859-1 / ASCII. Non-ASCII
characters (accented names, CJK, emoji) may be silently corrupted or truncated
during RPC calls. No automated test exists for character encoding round-trips.

**Impact**: Multi-country deployments (PH, GH) with non-ASCII patient names
or clinical data risk data corruption.

**Remediation**: P8 (Phase 498) — UTF-8 round-trip test harness that:
1. Writes known strings via RPC to VistA M globals
2. Reads them back and compares
3. Classifies character ranges: Latin-1, Latin-Extended, CJK, emoji
4. Reports which ranges survive, which are corrupted, which are rejected

**Files affected**:
- `apps/api/src/vista/utf8-roundtrip.ts` — new file
- `scripts/verify-utf8-roundtrip.ps1` — new file

---

## Priority Ordering

| Priority | Gap | Phase | Impact | Effort |
|----------|-----|-------|--------|--------|
| 1 | Tenant binding (no countryPackId on config) | P2 | Blocks all pack-based enforcement | Low |
| 2 | No request-scoped policy resolution | P3 | Blocks all runtime enforcement | Medium |
| 3 | Consent disconnected from pack | P4 | Country-specific consent flows broken | Medium |
| 4 | Data residency not enforced | P5 | Compliance risk for PH/GH | Medium |
| 5 | No retention / DSAR | P6 | GDPR/DPA non-compliance | High |
| 6 | i18n not validated | P7 | Silent missing translations | Low |
| 7 | UTF-8 not tested | P8 | Data corruption risk | Low |

---

## Cross-Cutting Observations

1. **Parallel systems**: The `regulatory/framework-registry.ts` (Phase 439)
   and `country-pack-loader.ts` (Phase 314) define overlapping regulatory
   profiles. P3 should establish pack as the canonical source; framework
   registry becomes a validator, not a parallel config.

2. **Localization store duplication**: `localization/localization-store.ts`
   has its own `CountryPack` type (in-memory CRUD). This is a different
   entity from the file-based `CountryPackValues`. P2 should clarify:
   file-based packs are the system of record; localization store is the
   tenant-scoped runtime cache.

3. **Terminology registry independence**: `terminology-registry.ts` defines
   `US_TERMINOLOGY_DEFAULTS` and `PH_TERMINOLOGY_DEFAULTS` as hardcoded
   constants. P3 should make these derive from the pack's
   `terminologyDefaults` section.

4. **Feature flag overlap**: Pack `featureFlags` and tenant `featureFlags`
   (Phase 275/109) are independent systems. P3 should define merge order:
   pack defaults → tenant overrides → runtime toggles.
