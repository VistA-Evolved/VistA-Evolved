# Wave 34 Manifest -- Multi-Country + Regulatory v2 + UTF-8 Lane

> Harden country-pack enforcement from metadata-only to runtime-enforced.
> Add tenant binding (locale/timezone/countryPackId), consent v2, data
> residency locks, retention + DSAR workflows, i18n coverage gate, and
> a UTF-8 VistA round-trip harness. Evidence bundle via conformance runner.

## Phase Map

| Wave Phase | Resolved ID | Title                                              | Prompt Folder                     | Status      |
| ---------- | ----------- | -------------------------------------------------- | --------------------------------- | ----------- |
| W34-P1     | 491         | Reservation + Manifest + Coverage Matrix           | `491-W34-P1-MANIFEST-COVERAGE`    | Active      |
| W34-P2     | 492         | Tenant Binding (countryPackId / locale / timezone) | `492-W34-P2-TENANT-BINDING`       | Not started |
| W34-P3     | 493         | Runtime Policy Spine                               | `493-W34-P3-RUNTIME-POLICY-SPINE` | Not started |
| W34-P4     | 494         | Consent + Privacy Controls v2                      | `494-W34-P4-CONSENT-PRIVACY-V2`   | Not started |
| W34-P5     | 495         | Data Residency + Region Locks                      | `495-W34-P5-DATA-RESIDENCY-LOCKS` | Not started |
| W34-P6     | 496         | Retention + DSAR Workflows                         | `496-W34-P6-RETENTION-DSAR`       | Not started |
| W34-P7     | 497         | i18n Coverage Gate                                 | `497-W34-P7-I18N-COVERAGE-GATE`   | Not started |
| W34-P8     | 498         | UTF-8 Lane (VistA Round-Trip Harness)              | `498-W34-P8-UTF8-LANE`            | Not started |
| W34-P9     | 499         | Country Conformance Runner + Evidence Bundle       | `499-W34-P9-CONFORMANCE-RUNNER`   | Not started |

## Scope

- P1: Wave reservation, manifest, country pack coverage matrix (what's enforced vs metadata-only)
- P2: Add countryPackId, locale, timezone to TenantConfig; PG migration; resolve at request time
- P3: Fastify onRequest hook resolving tenant -> country pack -> effective policy (units, date fmts, consent mode)
- P4: Country-aware consent engine v2 (grant/revoke/audit per regulatory profile), privacy segmentation
- P5: Region lock enforcement on data writes + audit shipping, cross-border transfer gating
- P6: Per-country retention policies, DSAR (data subject access request) export + erasure workflows
- P7: i18n coverage gate - CI-time check that all UI strings exist in every pack-supported locale
- P8: UTF-8 round-trip harness for VistA M globals (accented names, CJK, emoji edge cases)
- P9: Country conformance runner: per-pack automated checks, evidence bundle export

## Reserved Range

- **Wave**: 34
- **Phases**: 491-499
- **Branch**: main
- **Owner**: agent

## Existing Infrastructure (Inventory)

| Component                | Phase | File(s)                                        | Notes                                           |
| ------------------------ | ----- | ---------------------------------------------- | ----------------------------------------------- |
| Country pack loader      | 314   | `platform/country-pack-loader.ts`              | Full type system, validator, cache              |
| Country pack routes      | 314   | `routes/country-pack-routes.ts`                | 7 REST endpoints                                |
| Country packs (US/PH/GH) | 314   | `country-packs/{US,PH,GH}/values.json`         | 3 packs, US active, PH/GH draft                 |
| Consent engine           | 312   | `services/consent-engine.ts`                   | 8 categories, ConsentRecord, ConsentPolicy      |
| Consent-POU store        | 405   | `consent-pou/consent-store.ts`                 | Directive CRUD, in-memory                       |
| Privacy segmentation     | 343   | `auth/privacy-segmentation.ts`                 | Sensitivity tags, access reasons                |
| Privacy routes           | 343   | `routes/privacy-routes.ts`                     | Tag CRUD, access checks                         |
| Tenant config            | 275   | `config/tenant-config.ts`                      | DB-backed, **no countryPackId/locale/timezone** |
| Tenant security policy   | 342   | `auth/tenant-security-policy.ts`               | CIDR, MFA, exports, break-glass per tenant      |
| Audit shipping           | 157   | `audit-shipping/`                              | S3/MinIO shipper, scheduled job                 |
| i18n routes              | 132   | `routes/i18n-routes.ts`                        | 3 locales (en, fil, es), session preference     |
| Portal messages          | 132   | `apps/portal/public/messages/{en,fil,es}.json` | Portal UI strings                               |
| PHI redaction            | 151   | `lib/phi-redaction.ts`                         | Single-entry PHI scrub for all audit sinks      |

## Dependencies

- Phase 314 country packs (existing type system, 3 packs, validator)
- Phase 312 consent engine (ConsentCategory, ConsentRecord)
- Phase 275 tenant-config (will be extended with countryPackId/locale/timezone in P2)
- Phase 342 tenant security policy (break-glass, export controls)
- Phase 151 PHI redaction (audit trail sanitization)
- Phase 132 i18n routes (locale preference, message bundles)
