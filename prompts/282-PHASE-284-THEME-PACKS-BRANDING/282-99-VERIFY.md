# Phase 284 — Theme Packs + Tenant Branding Admin (VERIFY)

## Gates

### G282-01: BrandingConfig type exists

- `tenant-config.ts` exports `BrandingConfig` and `sanitizeBranding`
- All 7 fields defined: logoUrl, faviconUrl, primaryColor, secondaryColor, headerText, footerText, enabled

### G282-02: PG migration v28

- `pg-migrate.ts` contains version 28 with `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS branding`

### G282-03: GET /admin/branding/:tenantId returns branding

- Route returns `{ ok: true, tenantId, branding: {...} }`

### G282-04: PUT /admin/branding/:tenantId validates input

- Invalid hex color → 400 with errors array
- Non-HTTPS URL → 400 with errors array
- Valid input → 200 with sanitized branding

### G282-05: CSS injection prevention

- HTML tags stripped from headerText/footerText
- Only 6-digit hex colors accepted (no CSS expressions)
- URLs must be HTTPS (no javascript: or data: schemes)

### G282-06: Branding Admin UI page renders

- `/cprs/admin/branding` loads with 3 tabs: Branding, Theme, Preview
- Color pickers and text inputs present
- Preview tab shows live branding preview

### G282-07: Audit trail

- PUT branding → audit event with action `config.branding-update`

### G282-08: TypeScript clean

- `pnpm -C apps/api exec tsc --noEmit` → 0 errors
- `pnpm -C apps/web exec tsc --noEmit` → 0 errors

### G282-09: my-tenant returns branding

- GET /admin/my-tenant response includes `branding` field
