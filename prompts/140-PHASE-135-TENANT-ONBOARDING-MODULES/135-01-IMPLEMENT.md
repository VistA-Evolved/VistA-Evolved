# Phase 135 — Tenant Onboarding + Module Packaging (IMPLEMENT)

## Goal
Make the platform modular and sellable as full suite or specific modules
(Telehealth-only, Portal-only, RCM-only, etc.) without code forks and
without breaking tenancy.

## Hard Requirements
1. A tenant has entitlements (modules + features)
2. Server routes enforce entitlements (NOT UI-only hiding)
3. UI respects entitlements
4. Tenant provisioning is one command (script/CLI) and is auditable
5. No new scattered docs: 1 runbook at docs/runbooks/tenant-onboarding.md

## Implementation

### A) Canonical Entitlement Model (REUSE Phase 109)
- module_catalog, tenant_module, tenant_feature_flag, module_audit_log -- already exist
- Enhance tenant-context.tsx to carry system-level module IDs from /api/capabilities

### B) Enforcement Middleware (REUSE Phase 37C module-guard.ts)
- Already returns 403 with MODULE_DISABLED code
- Verify all module route patterns in config/modules.json are comprehensive

### C) UI Gating
- Admin sidebar already module-gated (Phase 76 layout.tsx)
- Add "Module Not Enabled" page for deep-link to disabled module routes
- Expose /api/tenant/entitlements endpoint for non-admin use (session-only)

### D) Tenant Provisioning CLI
- scripts/tenant/provision.mjs: creates tenant, seeds modules, writes audit
- scripts/tenant/enable-module.mjs: toggles module on for a tenant
- scripts/tenant/disable-module.mjs: toggles module off for a tenant

### E) CI Tests
- apps/api/tests/tenant-entitlements.test.ts: enforcement tests

## Files Touched
- scripts/tenant/provision.mjs (NEW)
- scripts/tenant/enable-module.mjs (NEW)
- scripts/tenant/disable-module.mjs (NEW)
- apps/api/tests/tenant-entitlements.test.ts (NEW)
- apps/web/src/app/cprs/admin/module-disabled/page.tsx (NEW)
- apps/api/src/routes/tenant-entitlement-api.ts (NEW)
- docs/runbooks/tenant-onboarding.md (NEW)
