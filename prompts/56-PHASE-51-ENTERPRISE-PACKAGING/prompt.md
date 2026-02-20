# Phase 51 -- Enterprise Packaging + Module Marketplace Ready Architecture

## User Request

Build enterprise-grade modular packaging on top of existing Phase 37C modularity. Four deliverables:

A) **MODULE MANIFESTS** -- Enhanced module definitions with: id, version, dependencies, routes, permissions, data stores, health checks. Enforce at runtime: disabled module cannot register routes.

B) **TENANT CONFIG** -- Tenant config loader: modules enabled, connector settings, jurisdiction pack selection. Safe defaults, no secrets in git.

C) **UI** -- Admin "Modules" page: list modules, toggle enable/disable, show dependency constraints.

D) **DOCS** -- docs/platform/modules.md, docs/platform/tenant-config.md

## Implementation Steps

1. Enhance `config/modules.json` -- add version, permissions[], dataStores[], healthCheckEndpoint per module
2. Update `apps/api/src/modules/module-registry.ts` types + loading to handle enhanced manifests
3. Add `getModuleHealth()` to module-registry that calls health endpoints
4. Create `apps/api/src/config/marketplace-tenant.ts` -- enhanced tenant config loader with connector settings + jurisdiction packs
5. Add new routes to `module-capability-routes.ts`: module health, manifest details, tenant marketplace config
6. Create `apps/web/src/app/cprs/admin/modules/page.tsx` -- Admin Modules UI
7. Write `docs/platform/modules.md` and `docs/platform/tenant-config.md`
8. Wire into index.ts, verify tsc clean

## Verification Steps

- `npx tsc --noEmit` clean in apps/api and apps/web
- All 13 modules have version, permissions, dataStores, healthCheckEndpoint
- Module guard still blocks disabled module routes (existing behavior preserved)
- Tenant config loader reads safe defaults
- Admin UI page renders with tabs

## Files Touched

- `config/modules.json` -- enhanced manifests
- `apps/api/src/modules/module-registry.ts` -- enhanced types + health
- `apps/api/src/config/marketplace-tenant.ts` -- new: tenant config loader
- `apps/api/src/routes/module-capability-routes.ts` -- new endpoints
- `apps/web/src/app/cprs/admin/modules/page.tsx` -- new: Admin Modules UI
- `docs/platform/modules.md` -- new: module architecture docs
- `docs/platform/tenant-config.md` -- new: tenant config docs
