# Phase 283 — Theme System Core (design tokens + theme provider + persistence)

## Implementation Steps

1. Extended theme-tokens.ts with 3 new theme packs (openmrs, openemr, high-contrast)
2. Added ThemePackId type, category/isDark/contrastLevel fields to ThemePack interface
3. Added resolveThemePackId(), isValidThemePackId(), getAllThemePacks() helpers
4. Extended UIPrefsDocument with themePack field
5. Added getUserThemePack() and setUserThemePack() to ui-prefs-store.ts
6. Added GET/PUT /ui-prefs/theme routes with server-side validation
7. Extended UIDefaults with themePack field in tenant-config.ts
8. Extended CPRSPreferences with themePack field + server sync
9. Added theme pack CSS token application effect in CPRSUIProvider
10. Added setThemePack callback to CPRSUIStateValue interface

## Theme Resolution Order

tenant default → user preference → system default ("modern-default")

## Available Theme Packs

| ID             | Name             | Category     | Dark? | Contrast |
| -------------- | ---------------- | ------------ | ----- | -------- |
| modern-default | Modern Default   | built-in     | No    | AA       |
| modern-dark    | Modern Dark      | built-in     | Yes   | AA       |
| vista-legacy   | VistA Legacy     | built-in     | No    | AA       |
| openmrs        | OpenMRS-Inspired | oss-inspired | No    | AA       |
| openemr        | OpenEMR-Inspired | oss-inspired | No    | AA       |
| high-contrast  | High Contrast    | built-in     | No    | AAA      |

## Files Touched

- `apps/web/src/lib/theme-tokens.ts` — 3 new packs + ThemePackId + helpers
- `apps/web/src/stores/cprs-ui-state.tsx` — themePack pref + server sync + CSS apply
- `apps/api/src/services/ui-prefs-store.ts` — themePack on UIPrefsDocument + get/set
- `apps/api/src/routes/ui-prefs.ts` — GET/PUT /ui-prefs/theme
- `apps/api/src/config/tenant-config.ts` — UIDefaults.themePack
- `apps/api/src/routes/admin.ts` — Default UIDefaults includes themePack
