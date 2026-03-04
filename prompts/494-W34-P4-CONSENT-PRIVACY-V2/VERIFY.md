# 494-99-VERIFY — Consent + Privacy Controls v2

## Gates

1. `consent-engine.ts` exports `getConsentProfileForPack()` that accepts CountryPackValues.
2. `/consent/policy-check` resolves framework from `request.countryPolicy.pack.regulatoryProfile.framework`.
3. `/consent-pou/directives` POST auto-sets granularity from pack when not overridden.
4. `/privacy/rights` returns effective rights (rightToErasure, dataPortability, breakGlassAllowed).
5. No PHI in audit entries (dfn, patientDfn never logged).
6. TypeScript compiles clean (`npx tsc --noEmit`).
