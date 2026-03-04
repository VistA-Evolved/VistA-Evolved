# 397-NOTES — Localization + Multi-Country Packs + Theming

## Design Decisions

### BCP 47 Locale Tags

All locale identifiers use BCP 47 format (e.g., en-US, fil-PH). The `direction` field
supports RTL for future Arabic/Hebrew locales.

### UCUM Unit Normalization

Unit profiles define preferred display units per measurement type. Each conversion includes
fromUnit, toUnit, factor, and offset (for temperature). Profiles reference UCUM codes directly.

### Translation Fallback Chain

Resolution: exact locale (e.g., fil-PH) → base language (fil) → en-US → null.
This ensures graceful degradation without hard failures.

### Theme Architecture (ADR-W22-THEMING)

Themes use CSS custom properties organized into 6 categories:

- Colors, typography, spacing, borders, shadows, animations
- Dark mode variants stored in `darkMode` map
- Three system presets: Legacy VistA (institutional blue), Modern Clinical (Material blue), High Contrast (WCAG AAA)
- System themes are protected from modification/deletion

### Country Pack Model

Each country pack bundles: ICD version (ICD-10, ICD-10-CM, ICD-11), formulary reference,
national lab reference range set, currency code, date/number format locale, and regulatory notes.
This supports multi-country clinical operations (US + Philippines primary targets).

### Seed Data Strategy

Base locales, unit profiles, and system themes are seeded at import time (module load).
They carry `isSystem: true` flag and cannot be deleted via API. Additional locales/themes
can be added via CRUD endpoints.

## Store Count: 6

All in-memory Maps, registered in store-policy.ts.
