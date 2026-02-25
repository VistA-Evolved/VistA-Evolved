# Phase 132: I18N Foundation -- Summary

## What Changed
- next-intl installed in both apps/web and apps/portal
- PG Migration v15: user_locale_preference + intake_question_schema tables with RLS
- 6 API endpoints: /i18n/locales (public), /i18n/locale (GET/PUT session), /intake/question-schema (public locale-aware), /admin/intake/question-schema (GET/POST admin)
- Locale message files: en.json, fil.json, es.json in both web and portal public/messages/
- I18nProvider + LanguageSwitcher components in both apps
- Intake page rewritten for locale-aware rendering with question preview from schema API
- Portal nav: added Pre-Visit Intake link + LanguageSwitcher in footer
- Web menu bar: LanguageSwitcher globe icon on the right side
- Portal settings: added fil (Filipino) to valid languages
- AUTH_RULES: /i18n/locales and /intake/question-schema are public; /i18n/* requires session

## How to Test Manually
1. Public locale list: curl http://127.0.0.1:3001/i18n/locales
2. Intake questions in Filipino: curl http://127.0.0.1:3001/intake/question-schema?locale=fil
3. Authenticate and test locale preference: GET/PUT /i18n/locale with session cookie

## Verifier Output
- Gauntlet FAST: 4 PASS, 0 FAIL, 1 WARN
- Gauntlet RC: 12 PASS, 0 FAIL, 1 WARN
- TypeScript: 0 errors in all 3 apps (api, web, portal)

## Follow-ups
- Convert more hardcoded strings to useTranslations() hooks
- Add more locales (zh, vi, ko, fr)
- Translate select options in intake questions
- Implement intake questionnaire fill page with question schema rendering
