# Phase 132 — VERIFY (I18N FOUNDATION)

## Gates

1. `next-intl` installed in web + portal `package.json`
2. Locale message files exist: `messages/{en,fil,es}.json` in both apps
3. `NextIntlClientProvider` wired in both root layouts
4. PG migration v15 creates `user_locale_preference` + `intake_question_schema`
5. `GET /auth/locale` returns current clinician locale
6. `PUT /auth/locale` persists locale to PG
7. Portal `portal_patient_setting.language` accepts "fil"
8. Language switcher renders in web CPRS area
9. Language switcher renders in portal nav
10. `GET /intake/question-schema?locale=en` returns questions
11. Intake page renders questions from schema
12. TypeScript clean (api, web, portal)
13. Gauntlet rc passes
14. No regressions in existing endpoints
