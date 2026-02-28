# Phase 310 — NOTES

## Decisions Made

1. **Shared package in `packages/locale-utils`** — not duplicated between portal
   and web. Both apps can import from the workspace package.
2. **Intl.* APIs only** — no moment.js, no date-fns, no luxon. Built-in APIs
   are sufficient and zero-dependency.
3. **RTL readiness, not RTL implementation** — infrastructure functions exist
   (`isRtlLocale`, `getTextDirection`) but no RTL locales are active yet.
4. **Audit-keys is a CI tool** — reports parity issues but doesn't auto-fix.

## Key Constraints

- Filipino (`fil`) and Spanish (`es`) must have key parity with English (`en`).
- No formatting functions should throw — all return empty string on invalid input.
- Currency formatting uses ISO 4217 codes from country pack `uiDefaults.currencyCode`.

## Follow-ups

- Adoption: Replace inline `toLocaleString()` calls in portal/web components
  with `formatDate()` / `formatNumber()` from this package (incremental).
- Add locale-aware formatting to clinical panels (Phase 314 country packs).
