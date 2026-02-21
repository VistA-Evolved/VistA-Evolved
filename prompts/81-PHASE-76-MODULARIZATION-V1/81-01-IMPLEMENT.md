# Phase 76 — Modularization v1 (Tenant-Scoped Feature Flags + Registry + Enforcement)

## User Request

Make the system modular and configurable so modules can be enabled/disabled
per tenant/facility without code forks.

## DoD

A) A Module Registry exists that defines modules, routes, API surface, and dependencies.
B) Feature flags are tenant-scoped and enforceable in BOTH web + api.
C) Disabled modules: routes hidden, endpoints reject with structured errors, no dead clicks.
D) Verification proves toggling works.

## Pre-Existing Infrastructure (Phase 37C / Phase 51)

- `apps/api/src/modules/module-registry.ts` — 12 modules, SKU profiles, tenant overrides
- `apps/api/src/middleware/module-guard.ts` — rejects disabled module endpoints with 403
- `apps/api/src/modules/capability-service.ts` — resolves capabilities per tenant
- `apps/api/src/routes/module-capability-routes.ts` — status, override, manifests endpoints
- `apps/web/src/stores/tenant-context.tsx` — `isModuleEnabled()`, `useModuleEnabled()`
- `apps/web/src/components/cprs/CPRSTabStrip.tsx` — hides disabled tabs
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — "Module Disabled" message
- `apps/web/src/app/cprs/admin/modules/page.tsx` — marketplace console (625 lines)
- `config/modules.json` — 12 module manifests
- `config/skus.json` — 7 SKU deploy profiles
- `config/capabilities.json` — 50+ capability definitions

## Gaps Identified

1. **Web-side module registry** — No `apps/web/src/modules/registry.ts`. Web side relies
   on API response but has no local registry with route/metadata mapping.
2. **Audit events for module toggles** — `POST /api/modules/override` logs via `log.info`
   but does NOT write to the immutable audit trail.
3. **Structured module-disabled error** — Guard returns `{ error, module, message }` but
   lacks a `code` field for programmatic client-side handling.
4. **Web admin sidebar** — Modules page exists but lacks sidebar for admin navigation.

## Implementation Steps

1. Create `apps/web/src/modules/registry.ts` — client-side module registry with metadata
2. Add immutable audit event on module toggle in `module-capability-routes.ts`
3. Enhance module guard 403 response with `code: "MODULE_DISABLED"` field
4. Create admin layout with sidebar linking modules/integrations/analytics/etc.
5. Write `scripts/verify-phase76-modularization.ps1` verifier
6. Update `scripts/verify-latest.ps1` to point to Phase 76

## Files Touched

- `apps/web/src/modules/registry.ts` (new)
- `apps/api/src/routes/module-capability-routes.ts` (edit — audit events)
- `apps/api/src/middleware/module-guard.ts` (edit — structured error code)
- `apps/web/src/app/cprs/admin/layout.tsx` (new — admin sidebar)
- `scripts/verify-phase76-modularization.ps1` (new)
- `scripts/verify-latest.ps1` (edit)
- `prompts/81-PHASE-76-MODULARIZATION-V1/81-01-IMPLEMENT.md` (this file)
- `prompts/81-PHASE-76-MODULARIZATION-V1/81-99-VERIFY.md`
