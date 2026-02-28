# Phase 281 — Verification

## Verification Steps
1. TS build clean (apps/api)
2. Theme-tokens.ts exports 6 built-in themes
3. UI-prefs routes: GET/PUT /ui-prefs/theme endpoints exist
4. Theme resolution: user pref > tenant default > system default
5. CPRSUIProvider applies theme pack tokens via inline CSS variables
6. No PHI in theme routes (only theme IDs and user DUZ)

## Acceptance Criteria
- [ ] TS build CLEAN (0 errors)
- [ ] 6 theme packs registered (modern-default, modern-dark, vista-legacy, openmrs, openemr, high-contrast)
- [ ] Theme preference persisted to server via PUT /ui-prefs/theme
- [ ] Theme loaded from server on page load via GET /ui-prefs/theme
- [ ] Invalid theme IDs rejected with 400
- [ ] Existing pages render unchanged under modern-default
