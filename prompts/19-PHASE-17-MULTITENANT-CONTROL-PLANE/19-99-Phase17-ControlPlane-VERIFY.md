# Phase 17 — Multi-Tenant Control Plane VERIFY

## Verification Steps

1. Run `scripts/verify-phase17-multitenant-control-plane.ps1` from repo root
2. Expect: all PASS, 0 FAIL, 0 WARN
3. Confirm TypeScript compiles clean: `pnpm exec tsc --noEmit` in both apps

## What the verifier checks

- Tenant config file exists with TenantConfig interface
- Admin routes file exists with CRUD endpoints
- SessionData includes tenantId
- Auth routes wire tenantId
- Audit actions include config.tenant-update, config.feature-flag-update, etc.
- Security rules include /admin/my-tenant session-level
- Tenant context provider exists with useTenant, useFeatureFlag, useModuleEnabled
- CPRS layout includes TenantProvider
- CPRSTabStrip filters by isModuleEnabled
- Chart page has module gating ("Module Disabled" message)
- Preferences page has "Reset to Facility Defaults"
- NotesPanel integrates facility templates
- Admin integrations page exists
- Runbook exists
- No regressions from Phase 10→16
