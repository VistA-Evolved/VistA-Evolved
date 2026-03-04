# 494-01-IMPLEMENT — Consent + Privacy Controls v2

## Objective

Wire the consent engine and consent-POU stores to resolve their regulatory
profile from the tenant's country pack (via `request.countryPolicy`) rather
than requiring callers to pass a hardcoded framework name.

## Files Changed

| File                                         | Change                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api/src/services/consent-engine.ts`    | Add `getConsentProfileForPack()` — resolves consent profile from a CountryPackValues object     |
| `apps/api/src/routes/consent-routes.ts`      | Add `/consent/policy-check` — country-policy-aware compliance check using request.countryPolicy |
| `apps/api/src/consent-pou/consent-routes.ts` | Auto-set granularity on directive create from pack's consentGranularity                         |
| `apps/api/src/routes/privacy-routes.ts`      | Add `/privacy/rights` — returns effective privacy rights (erasure, portability, break-glass)    |

## Policy Decisions

1. Consent compliance check auto-resolves framework from tenant's pack — no manual `framework` param needed.
2. Consent-POU directive creation reads pack granularity as default; callers can still override.
3. Privacy rights endpoint reads pack's `rightToErasure`, `dataPortability`, `breakGlassAllowed`.
4. All new endpoints are session-authenticated (inherit from AUTH_RULES).
5. No PHI in any new log/audit entries.
