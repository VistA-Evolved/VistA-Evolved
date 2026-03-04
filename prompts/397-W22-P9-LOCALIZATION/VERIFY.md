# 397-99-VERIFY — Localization + Multi-Country Packs + Theming

## Verification Gates

### Gate 1: TypeScript Compilation

```powershell
cd apps/api; pnpm exec tsc --noEmit
```

Expected: CLEAN (0 errors)

### Gate 2: Route Registration

- `localizationRoutes` imported in register-routes.ts
- `server.register(localizationRoutes)` called

### Gate 3: Auth Rules

- `/localization/` pattern → session auth

### Gate 4: Store Policy

- 6 entries: locales, translation-bundles, ucum-unit-profiles, country-packs, themes, tenant-locale-configs
- All classified as `operational`, `in_memory_only`

### Gate 5: Seed Data

- 4 base locales: en-US, en-GB, fil-PH, es-MX
- 2 UCUM unit profiles: US Conventional (mg/dL, lbs, °F), SI Metric (mmol/L, kg, °C)
- 3 system themes: Legacy VistA (#003366), Modern Clinical (#1976d2 + dark), High Contrast (WCAG AAA + dark)

### Gate 6: Translation Fallback

- Resolve chain: exact locale match → base language → en-US → null

### Gate 7: Theme Protection

- System themes (isSystem: true) cannot be modified or deleted (returns 403)

### Gate 8: Endpoint Count

- 32 REST endpoints under `/localization/*`

## Result: PASS
