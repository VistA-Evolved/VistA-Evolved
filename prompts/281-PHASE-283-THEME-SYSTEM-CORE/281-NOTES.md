# Phase 281 — Notes

- Existing ThemeMode (light/dark/system) coexists with ThemePackId
  - ThemeMode controls data-theme attribute (light/dark)
  - ThemePack controls CSS variable overrides via inline styles
  - Dark theme packs also set data-theme="dark" for compatibility
- No PG migration needed for this phase — theme pref stored via existing ui_preference table's pref_key/pref_value pattern
- OpenMRS/OpenEMR themes are clean-room inspired styling, no copied assets
- High-contrast theme targets WCAG AAA for accessibility compliance
- Custom themes use "custom:<id>" prefix and bypass built-in validation
