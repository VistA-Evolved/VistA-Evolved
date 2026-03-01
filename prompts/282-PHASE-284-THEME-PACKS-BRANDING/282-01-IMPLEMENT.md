# Phase 284 — Theme Packs + Tenant Branding Admin (IMPLEMENT)

## Objective
Extend the P281 theme system with a per-tenant branding admin surface.
Allow facility admins to set custom logo URL, accent colors, header/footer text,
and the default theme pack for their tenant.

## Deliverables
1. `BrandingConfig` interface + `sanitizeBranding()` validator in `tenant-config.ts`
2. `branding` field on `TenantConfig` with PG migration v28 (JSONB column)
3. `GET/PUT /admin/branding/:tenantId` routes in `admin.ts`
4. `updateBranding()` function in tenant-config store
5. Admin UI page at `/cprs/admin/branding` with 3 tabs: Branding, Theme, Preview
6. CSS injection prevention via strict URL/color/text sanitization
7. `config.branding-update` audit action

## Files Changed
- `apps/api/src/config/tenant-config.ts` — BrandingConfig type, sanitization, updateBranding()
- `apps/api/src/platform/pg/repo/tenant-config-repo.ts` — branding field in row type + DB queries
- `apps/api/src/platform/pg/pg-migrate.ts` — migration v28: branding JSONB column
- `apps/api/src/routes/admin.ts` — GET/PUT branding routes + import updates
- `apps/api/src/lib/audit.ts` — config.branding-update action
- `apps/web/src/app/cprs/admin/branding/page.tsx` — New admin UI page

## Security
- Logo/favicon URLs must be HTTPS (regex validated)
- Colors must be valid 6-digit hex (regex validated)
- Text fields stripped of HTML tags and control characters
- Max lengths enforced: headerText 100, footerText 200, URLs 2048
- All mutations audited with `config.branding-update`
