# 497-01-IMPLEMENT — i18n Coverage Gate

## Objective

Create a CI-time QA gate that validates all country-pack-supported locales
have complete message bundles in both apps/web and apps/portal.

## Files Changed

| File                                      | Change                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `scripts/qa-gates/i18n-coverage-gate.mjs` | NEW — CI gate that scans country packs for supportedLocales, then checks apps/web + apps/portal messages dirs |
| `apps/api/src/routes/i18n-routes.ts`      | Add `/i18n/coverage` endpoint returning per-pack locale coverage                                              |

## Policy Decisions

1. Each pack's `supportedLocales` array defines which locales must have message bundles.
2. Gate reports WARN for missing locales, FAIL for empty/malformed message files.
3. Coverage endpoint returns per-pack locale status for runtime monitoring.
