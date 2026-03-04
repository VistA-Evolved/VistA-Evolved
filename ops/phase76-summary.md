# Phase 76 — Modularization v1 — Summary

## What Changed

- **apps/web/src/modules/registry.ts** (NEW): Client-side module registry with
  12 module definitions (kernel, clinical, portal, telehealth, imaging, analytics,
  interop, intake, ai, iam, rcm, scheduling). Each provides id, label, description,
  icon, tabSlugs, apiPrefixes, adminPath, dependencies, alwaysEnabled. Seven lookup
  helpers exported: getModuleDefinitions, getModuleById, getModuleForTab, getTabsForModule,
  getAdminModules, filterEnabledModules, isTabVisible.

- **apps/web/src/app/cprs/admin/layout.tsx** (NEW): Admin sidebar layout wrapping all
  /cprs/admin/\* pages. Seven navigation items (Modules, Integrations, Analytics,
  RCM/Billing, Audit Viewer, Reports, Migration). Module-gated: items with moduleId
  hidden when module disabled. Active path highlighting via usePathname.

- **apps/api/src/middleware/module-guard.ts** (EDITED): Added structured error code
  `code: "MODULE_DISABLED"` to the 403 response body so clients can programmatically
  distinguish module-disabled from generic auth failures.

- **apps/api/src/routes/module-capability-routes.ts** (EDITED): Added immutableAudit
  calls on module toggle (action: "module.toggle") and override clear
  (action: "module.override-clear") with actor info and tenantId context.

- **apps/api/src/lib/immutable-audit.ts** (EDITED): Extended ImmutableAuditAction
  type union with "module.toggle" and "module.override-clear" action types.

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Log in via web UI
3. Navigate to Admin > Modules — see all 12 modules listed
4. Toggle a module off — confirm:
   - Its tab disappears from the tab strip
   - Its chart page shows "Module Disabled"
   - Its API endpoints return 403 with `code: "MODULE_DISABLED"`
   - Its admin sidebar link is hidden
   - An audit entry is written (check /iam/audit)
5. Toggle it back on — confirm everything restores

## Verifier Output

```
67/67 PASS, 0 warning(s)
```

All sections pass: File Existence (14), Web Module Registry (12), API Module Guard (6),
Module Toggle Audit (7), Admin Layout Sidebar (10), Existing Enforcement (8),
Config Files (5), verify-latest (1), TypeScript Compile (2), Anti-Pattern Checks (2).

## Follow-ups

- Persist tenant module overrides to durable storage (currently in-memory Map)
- Add module toggle UI confirmation dialog
- Add module dependency visualization graph
- Add per-module health dashboard in admin modules page
