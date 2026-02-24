# Phase 109 -- Modular Packaging + Feature Flags (IMPLEMENT)

## User Request

Build a modular system so major capabilities can be enabled/disabled per tenant
and later sold as add-ons. Introduce Module Registry + Entitlements layer.

## Implementation Steps

1. Inventory all major modules (extends Phase 37C module-registry.ts)
2. Create docs/architecture/module-catalog.md
3. Add 4 SQLite tables to PlatformStore: module_catalog, tenant_module,
   tenant_feature_flag, module_audit_log
4. Create DB repo + migration for new tables
5. Wire module-registry.ts to read/write from DB (persist overrides)
6. Add API routes for module CRUD + feature flags + audit
7. Enhance module-guard.ts to check DB-backed entitlements
8. Add admin UI page/tab for module + feature flag management
9. Define baseline enabled modules so existing tenants keep working
10. Add E2E + API tests to Phase 108 QA harness
11. Rebuild phase-index.json

## Verification Steps

1. Disabling a module hides it from UI navigation
2. API returns 403 for disabled module routes
3. Audit logs created for all changes
4. Tenant isolation: tenant A config does not leak to tenant B
5. TypeScript compiles: `npx tsc --noEmit`
6. Phase 108 verifier still passes
7. Next.js build succeeds

## Files Touched

- docs/architecture/module-catalog.md (new)
- apps/api/src/platform/db/schema.ts (add 4 tables)
- apps/api/src/platform/db/migrate.ts (add CREATE TABLE statements)
- apps/api/src/platform/db/repo/module-repo.ts (new)
- apps/api/src/platform/db/repo/index.ts (re-export)
- apps/api/src/modules/module-registry.ts (DB persistence)
- apps/api/src/modules/feature-flags.ts (new)
- apps/api/src/routes/module-entitlement-routes.ts (new)
- apps/api/src/middleware/module-guard.ts (enhanced)
- apps/api/src/index.ts (register routes)
- apps/web/src/app/cprs/admin/modules/page.tsx (enhanced)
- scripts/verify-phase109-modular-packaging.ps1 (new)
- docs/qa/phase-index.json (regenerated)
