# Tenant Onboarding + Module Packaging — Runbook

> Phase 135: Sellable SKU-based module packaging with server-side enforcement.

---

## Overview

VistA-Evolved is modular. Each tenant (facility, organization) has a set
of enabled modules determined by their subscription SKU. Enforcement is
**server-side** — the API returns 403 `MODULE_DISABLED` for routes
belonging to disabled modules. The UI hides navigation items for disabled
modules and shows a "Module Not Enabled" page for deep-linked URLs.

---

## Architecture

```
config/modules.json    — 13 module definitions with route patterns, deps, adapters
config/skus.json       — 7 SKU profiles (FULL_SUITE, CLINICIAN_ONLY, etc.)
                          |
module-registry.ts     — Loads definitions, resolves enabled modules per tenant
module-guard.ts        — Fastify onRequest hook: 403 if module disabled
module-repo.ts         — DB CRUD for entitlements (SQLite via Drizzle)
module-catalog-seed.ts — Seeds module_catalog from modules.json on startup
                          |
admin layout.tsx       — UI sidebar: hides nav for disabled modules
tenant-context.tsx     — Client-side hook: isModuleEnabled() checks both
                         tab-level and system-level module IDs
```

---

## SKU Profiles

| SKU | Modules | Target Market |
|-----|---------|---------------|
| FULL_SUITE | All 13 | VA Medical Centers, large health systems |
| CLINICIAN_ONLY | kernel, clinical, analytics | Small clinics |
| PORTAL_ONLY | kernel, portal, intake | Patient engagement |
| TELEHEALTH_ONLY | kernel, telehealth, portal | Rural health |
| RCM_ONLY | kernel, clinical, rcm, analytics | Billing companies |
| IMAGING_ONLY | kernel, clinical, imaging | Radiology groups |
| INTEROP_ONLY | kernel, interop, analytics | HIE organizations |

---

## Provisioning a New Tenant

### Quick Start (CLI)

```bash
# Full suite tenant
node scripts/tenant/provision.mjs \
  --tenant-id facility-42 \
  --name "Metro General Hospital" \
  --sku FULL_SUITE \
  --station 542

# Telehealth-only tenant
node scripts/tenant/provision.mjs \
  --tenant-id clinic-7 \
  --name "Rural Telehealth Clinic" \
  --sku TELEHEALTH_ONLY \
  --station 507

# Dry run (preview only)
node scripts/tenant/provision.mjs \
  --tenant-id test-99 \
  --name "Test Facility" \
  --sku RCM_ONLY \
  --dry-run
```

### What Provisioning Does

1. Creates a tenant record via `PUT /admin/tenants/:id`
2. Seeds module entitlements via `POST /admin/modules/entitlements/seed`
3. Writes audit entries for all changes
4. The module guard immediately enforces the new entitlements

---

## Enabling / Disabling Modules

### Via CLI

```bash
# Enable a module
node scripts/tenant/enable-module.mjs \
  --tenant-id facility-42 \
  --module rcm \
  --reason "Contract signed Q1 2026"

# Disable a module
node scripts/tenant/disable-module.mjs \
  --tenant-id facility-42 \
  --module telehealth \
  --reason "Contract expired"
```

### Via Admin API

```bash
# Enable
curl -b cookies.txt -X POST http://127.0.0.1:3001/admin/modules/entitlements \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"tenantId":"facility-42","moduleId":"rcm","enabled":true,"reason":"Contract signed"}'

# Disable
curl -b cookies.txt -X POST http://127.0.0.1:3001/admin/modules/entitlements \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"tenantId":"facility-42","moduleId":"telehealth","enabled":false,"reason":"Contract expired"}'
```

### Via Admin UI

Navigate to `/cprs/admin/modules` → **Entitlements** tab → Toggle modules on/off.

---

## Server-Side Enforcement

The module guard (`module-guard.ts`) runs as a Fastify `onRequest` hook on
every request. It:

1. Strips query params from the URL
2. Checks bypass patterns (health, auth, admin modules, posture)
3. Resolves which module owns the route via regex patterns
4. Checks if that module is enabled for the requesting tenant
5. Returns **403** with `code: "MODULE_DISABLED"` if blocked

```json
{
  "ok": false,
  "code": "MODULE_DISABLED",
  "error": "Module not enabled",
  "module": "rcm",
  "message": "Module 'rcm' (Revenue Cycle Management) is not enabled for this facility"
}
```

**This is NOT UI-only hiding.** Even if a client bypasses the UI and calls
the API directly, the guard will reject the request.

---

## UI Behavior

### Navigation Gating
The admin sidebar (`layout.tsx`) filters navigation items based on
`isModuleEnabled()`. Items for disabled modules are hidden.

### Deep-Link Protection
If a user directly navigates to a URL belonging to a disabled module
(e.g., bookmarked `/cprs/admin/rcm`), the layout intercepts and shows
a "Module Not Enabled" page with:
- Module name
- Guidance to contact administrator
- Link to Module Administration page

### System-Level Module IDs
The `/admin/my-tenant` endpoint returns both:
- `enabledModules`: Tab-level IDs (cover, meds, notes, etc.)
- `systemModules`: System-level IDs (kernel, clinical, rcm, telehealth, etc.)

The `tenant-context.tsx` `isModuleEnabled()` hook checks both lists.

---

## Audit Trail

All module changes are logged to `module_audit_log` table:
- Actor (who made the change)
- Tenant, module, action (enable/disable)
- Before/after state
- Reason text
- Timestamp

Query via: `GET /admin/modules/audit?tenantId=facility-42&limit=100`

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `module_catalog` | Module definitions (seeded from modules.json) |
| `tenant_module` | Per-tenant module entitlements |
| `tenant_feature_flag` | Per-tenant feature flags |
| `module_audit_log` | Append-only audit trail |

---

## Troubleshooting

### Module appears disabled but should be enabled
1. Check entitlements: `GET /admin/modules/entitlements?tenantId=<id>`
2. Check SKU: `echo $DEPLOY_SKU` (defaults to FULL_SUITE)
3. Check DB: module_catalog must be seeded (happens at startup)
4. Re-seed: `POST /admin/modules/entitlements/seed`

### 403 MODULE_DISABLED on expected routes
1. Verify the route pattern exists in `config/modules.json`
2. Verify the module is enabled for the tenant
3. Check bypass patterns in `module-guard.ts`

### UI nav items missing
1. Check `systemModules` in `/admin/my-tenant` response
2. Clear browser cache and refresh
3. Verify `ADMIN_NAV` items have correct `moduleId` in `layout.tsx`
