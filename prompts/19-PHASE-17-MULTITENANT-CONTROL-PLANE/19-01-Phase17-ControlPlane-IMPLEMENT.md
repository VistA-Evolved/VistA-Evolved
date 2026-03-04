# Phase 17 — Multi-Tenant Control Plane IMPLEMENT

## User Request

Multi-Tenant + Facility Configuration + Feature Flags + Theme/Layout governance + Templates + Interop status (Enterprise SaaS control plane) with full regression 10→16.

## Implementation Steps

### A) Tenant + Facility model (API)

- Create `apps/api/src/config/tenant-config.ts`: Tenant model, TenantStore, load from config file
- Add `tenantId` to SessionData
- Wire tenant context into session creation on login

### B) Config store + admin endpoints

- Create `apps/api/src/routes/admin.ts` with endpoints:
  - GET/PUT /admin/tenant-config
  - GET/PUT /admin/feature-flags
  - GET/PUT /admin/ui-defaults
  - GET/PUT /admin/templates
- All admin-only via existing RBAC

### C) Feature flags + module gating (web)

- Create `apps/web/src/stores/tenant-context.tsx`: TenantProvider, feature flags, facility switcher
- Gate CPRS tabs/menus by enabledModules
- Disabled modules show "disabled by facility policy" message

### D) Theme/layout governance

- Extend preferences page with "Reset to facility defaults" button
- Persist user overrides per-user + respect tenant defaults as base

### E) Templates system

- Note templates: admin defines, note editor picks
- Order set templates: admin defines, order page lists

### F) Interop/connector status panel

- Create /admin/integrations endpoint (API)
- Create /cprs/admin/integrations page (web)

### G) Prompts + runbooks + verifier

- Prompt folder: 19-PHASE-17-MULTITENANT-CONTROL-PLANE/
- Runbook: docs/runbooks/multitenant-control-plane-phase17.md
- Verifier: scripts/verify-phase17-multitenant-control-plane.ps1

## Files Touched

- NEW: apps/api/src/config/tenant-config.ts
- NEW: apps/api/src/routes/admin.ts
- NEW: apps/web/src/stores/tenant-context.tsx
- NEW: apps/web/src/app/cprs/admin/integrations/page.tsx
- MODIFIED: apps/api/src/auth/session-store.ts (add tenantId)
- MODIFIED: apps/api/src/auth/auth-routes.ts (wire tenant on login)
- MODIFIED: apps/api/src/index.ts (register admin routes)
- MODIFIED: apps/api/src/lib/audit.ts (add admin audit actions)
- MODIFIED: apps/web/src/app/cprs/layout.tsx (add TenantProvider)
- MODIFIED: apps/web/src/stores/cprs-ui-state.tsx (facility defaults reset)
- MODIFIED: apps/web/src/components/cprs/CPRSTabStrip.tsx (feature gating)
- MODIFIED: apps/web/src/app/cprs/settings/preferences/page.tsx (reset button)
- NEW: docs/runbooks/multitenant-control-plane-phase17.md
- NEW: scripts/verify-phase17-multitenant-control-plane.ps1
