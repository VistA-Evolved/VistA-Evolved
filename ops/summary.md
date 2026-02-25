# Phase 132 VERIFY -- I18N Foundation

## What Changed

### i18n Wiring Fixes (Critical)
- **portal-nav.tsx**: Wired `useTranslations("nav")` + `useTranslations("common")` from next-intl. All 17 nav items now read from locale message files instead of hardcoded English.
- **intake/page.tsx**: Removed entire 60-line inline `I18N` dictionary. Replaced with `useTranslations("intake")`, `useTranslations("common")`, `useTranslations("language")`. Fixed `toLocaleDateString(locale)`.
- **CPRSMenuBar.tsx**: Added `useTranslations('nav')` for 5 top-level menu names (File, Edit, View, Tools, Help).

### Dead Code Removal
- Deleted 6 dead duplicate message files: `apps/{web,portal}/messages/{en,fil,es}.json` (byte-for-byte copies of `public/messages/`).

### Bug Fixes
- **security.ts**: Fixed `setErrorHandler` to `return reply.code(statusCode).send({...})`. Missing `return` caused `ERR_HTTP_HEADERS_SENT` crash on 4xx/5xx responses in Fastify v5. (Pre-existing bug, not introduced by Phase 132.)
- **i18n-routes.ts**: Fixed `"Espanol"` to `"Espanol"` with tilde-n.
- **portal messages**: Added `changeViaSidebar` key in all 3 locale files.

## How to Test Manually

```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login
curl -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# 3. Test locale CRUD
curl http://127.0.0.1:3001/i18n/locales
curl http://127.0.0.1:3001/i18n/locale -b cookies.txt
curl -X PUT http://127.0.0.1:3001/i18n/locale \
  -H "Content-Type: application/json" -d '{"locale":"fil"}' -b cookies.txt

# 4. Test question schema in each locale
curl "http://127.0.0.1:3001/intake/question-schema?locale=fil"
curl "http://127.0.0.1:3001/intake/question-schema?locale=es"

# 5. Test crash fix (should return 401, NOT crash)
curl http://127.0.0.1:3001/portal/settings -b cookies.txt
curl http://127.0.0.1:3001/health   # API should still be running
```

## Verifier Output

### Gauntlet FAST: 4 PASS / 0 FAIL / 1 WARN
### Gauntlet RC: 12 PASS / 0 FAIL / 1 WARN

### i18n E2E Gates: 13/13 PASS
- G1-G9: Locale CRUD lifecycle (en/fil/es), invalid locale, unauth 401
- G10-G12: Question schema in 3 locales with correct translations
- G13: Admin endpoint returns 24 questions (8 per locale)

### System Regression: 11/11 PASS
- health, ready, vista/ping, patient-list, allergies, portal/settings 401,
  capabilities, CSRF refresh, adapters/health, posture/observability, i18n/locales

## Follow-ups
- CPRSMenuBar ~50 sub-menu items still hardcoded English (future i18n deepening phase)
- Intake session status badges not yet i18n'd (LOW priority)
