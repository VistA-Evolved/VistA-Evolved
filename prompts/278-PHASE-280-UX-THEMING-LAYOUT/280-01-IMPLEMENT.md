# Phase 280 — UX Theming & Layout Convergence

## User Request

Fix dark mode (CSS exists but never applied to DOM), migrate hardcoded hex colors
to CSS variables, add system theme detection, and create theme packs for
tenant-level customization.

## Inventory

- `apps/web/src/stores/cprs-ui-state.tsx` — CPRSUIProvider with ThemeMode type
- `apps/web/src/components/cprs/cprs.module.css` — Has 22 CSS vars + dark theme block
- `apps/web/src/components/chart/MenuBar.module.css` — Hardcoded hex colors
- `apps/web/src/components/chart/TabStrip.module.css` — Hardcoded hex colors
- `apps/web/src/components/chart/PatientHeader.module.css` — Hardcoded hex colors
- `apps/web/src/components/chart/panels/panels.module.css` — Hardcoded hex colors
- `apps/web/src/app/globals.css` — Own prefers-color-scheme media query
- `apps/web/src/app/layout.tsx` — No data-theme attribute

## Root Cause: BUG-071 — Dark mode CSS defined but never applied

CPRSUIProvider stores `theme: 'light' | 'dark' | 'system'` in preferences,
MenuBar dispatches 'theme:dark' action, but NO code sets `data-theme` attribute
on `document.documentElement`. The dark CSS variables at `[data-theme='dark']`
are unreachable.

## Implementation Steps

1. Fix CPRSUIProvider to apply `data-theme` attribute via useEffect
2. Add system theme detection (`matchMedia('prefers-color-scheme: dark')`)
3. Create `apps/web/src/lib/theme-tokens.ts` — theme pack definitions
4. Migrate chart/ CSS modules from hardcoded hex to `--cprs-*` variables
5. Create verification QA gate

## Verification Steps

- `data-theme` is set in CPRSUIProvider via useEffect
- System theme detection exists (matchMedia listener)
- Theme tokens module exports theme packs
- Chart CSS modules reference `--cprs-*` variables, not hardcoded hex
- QA gate passes
