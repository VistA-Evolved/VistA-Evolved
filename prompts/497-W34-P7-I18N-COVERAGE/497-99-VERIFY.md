# 497-99-VERIFY — i18n Coverage Gate

## Gates
1. `scripts/qa-gates/i18n-coverage-gate.mjs` exists and is executable.
2. Gate scans all country-packs/*/values.json for supportedLocales.
3. Gate checks apps/web/public/messages/{locale}.json exists for each supported locale.
4. Gate checks apps/portal/public/messages/{locale}.json exists for each supported locale.
5. `/i18n/coverage` endpoint returns per-pack coverage report.
6. TypeScript compiles clean.
