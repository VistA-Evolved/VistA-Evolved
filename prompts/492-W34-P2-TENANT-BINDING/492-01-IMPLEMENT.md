# Phase 492 — W34-P2: Tenant Binding (countryPackId / locale / timezone)

## Objective

Add `countryPackId`, `locale`, and `timezone` as first-class fields on
`TenantConfig`. PG migration adds the columns. Build default tenant
resolves from env vars or country pack defaults. The resolver function
`resolveCountryPolicy(tenantId)` becomes the canonical entry point for
all pack-based enforcement in P3-P9.

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `apps/api/src/config/tenant-config.ts` | EDIT | Add 3 fields to TenantConfig, toRow, fromRow, buildDefaultTenant |
| `apps/api/src/platform/pg/repo/tenant-config-repo.ts` | EDIT | Add 3 fields to TenantConfigRow, upsert SQL, rowFromDb |
| `apps/api/src/platform/pg/pg-migrate.ts` | EDIT | v51 ALTER TABLE + CANONICAL_RLS_TABLES no change needed |
| `apps/api/src/platform/country-pack-loader.ts` | EDIT | Add resolveCountryPolicy() |
| `prompts/492-W34-P2-TENANT-BINDING/492-01-IMPLEMENT.md` | CREATE | This file |
| `prompts/492-W34-P2-TENANT-BINDING/492-99-VERIFY.md` | CREATE | Verify prompt |

## Policy Decisions

1. `countryPackId` defaults to `"US"` (matching existing US-centric sandbox)
2. `locale` defaults to country pack's `defaultLocale` (or `"en"`)
3. `timezone` defaults to country pack's `defaultTimezone` (or `"America/New_York"`)
4. `resolveCountryPolicy(tenantId)` returns the full CountryPackValues or null
5. These 3 fields are nullable in early-migration tenants; resolver falls back to defaults

## Verification

Run `prompts/492-W34-P2-TENANT-BINDING/492-99-VERIFY.md` checks.
