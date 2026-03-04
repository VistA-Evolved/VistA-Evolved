# Phase 132 — I18N FOUNDATION (MULTILINGUAL UI + INTAKE SCHEMA)

## User Request

Make web + portal multilingual-ready without refactors later.
Add multilingual intake scaffold (no "AI brain" yet — just structure + locale support).

## Hard Requirements

- Locale preference persisted per user (Postgres)
- Language switcher UI in both web and portal
- No runtime JSON datastore usage (PG-backed)
- Initial locales: en, fil (Filipino/Tagalog), es (Spanish)

## Implementation Steps

### 1. i18n Framework Integration

- Install `next-intl` in both `apps/web` and `apps/portal`
- Create locale message files: `messages/{en,fil,es}.json` in both apps
- Wire `NextIntlClientProvider` in root layouts
- Make `<html lang>` dynamic based on selected locale

### 2. Locale Preference Persistence (Postgres)

- PG migration v15: `user_locale_preference` table (clinician locale, tenant-scoped)
- API endpoints: `GET/PUT /auth/locale` for clinician preference
- Portal: already has `portal_patient_setting.language` — extend to include "fil"
- Add "fil" to `VALID_LANGUAGES` and `LANGUAGE_OPTIONS` in portal-settings.ts

### 3. Language Switcher UI

- Web: Globe icon dropdown in CPRS header area
- Portal: Language selector in nav sidebar footer + profile settings

### 4. Shared String Conversion

- Convert top-level navigation labels, page headers, common buttons to i18n keys
- Web: CPRS menu bar, patient banner, panel headers
- Portal: Nav items, dashboard cards, profile labels

### 5. Intake Foundation (Locale-Aware)

- PG migration v15: `intake_question_schema` table (question definitions with locale variants)
- API: `GET /intake/question-schema?locale=en` — returns locale-appropriate questions
- API: `POST /admin/intake/question-schema` — admin creates/updates questions
- Seed default intake questions in en + fil + es
- Portal intake page: renders questions from schema in selected locale

## Files Touched

- `apps/web/package.json` — add next-intl
- `apps/portal/package.json` — add next-intl
- `apps/web/messages/{en,fil,es}.json` — locale strings
- `apps/portal/messages/{en,fil,es}.json` — locale strings
- `apps/web/src/app/layout.tsx` — NextIntlClientProvider
- `apps/portal/src/app/layout.tsx` — NextIntlClientProvider
- `apps/web/src/components/cprs/LanguageSwitcher.tsx` — new
- `apps/portal/src/components/LanguageSwitcher.tsx` — new
- `apps/api/src/platform/pg/pg-migrate.ts` — v15 migration
- `apps/api/src/routes/i18n-routes.ts` — locale preference + intake schema
- `apps/api/src/services/portal-settings.ts` — add "fil" locale
- `apps/api/src/intake/intake-question-schema.ts` — new, question schema store
- `apps/portal/src/app/dashboard/intake/page.tsx` — locale-aware rendering
- `config/capabilities.json` — i18n capabilities

## Verification Steps

- TypeScript clean (api, web, portal)
- API serves locale preference endpoints
- Language switcher renders and persists selection
- Intake questions returned in selected locale
- Gauntlet fast + rc pass
