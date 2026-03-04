# Multi-Tenant Control Plane — Phase 17 Runbook

## Overview

Phase 17 adds the enterprise SaaS control plane: multi-tenant facility
configuration, feature flags, module gating, note templates, UI defaults
governance, and integration/connector status monitoring.

## Architecture

### API (`apps/api/src/`)

| File                      | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `config/tenant-config.ts` | TenantConfig model, in-memory TenantStore, default tenant seeded from env           |
| `routes/admin.ts`         | Admin CRUD endpoints for tenants, feature flags, UI defaults, templates, connectors |
| `auth/session-store.ts`   | SessionData extended with `tenantId` field                                          |
| `auth/auth-routes.ts`     | Login wires `tenantId` via `resolveTenantId()`                                      |
| `middleware/security.ts`  | AUTH_RULES updated: `/admin/my-tenant` = session-level (non-admin)                  |
| `lib/audit.ts`            | 7 new AuditAction types for config admin operations                                 |

### Web (`apps/web/src/`)

| File                                     | Purpose                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `stores/tenant-context.tsx`              | TenantProvider, `useTenant()`, `useFeatureFlag()`, `useModuleEnabled()`, `useFacilityDefaults()` |
| `app/cprs/layout.tsx`                    | TenantProvider added to provider stack (inside SessionProvider)                                  |
| `components/cprs/CPRSTabStrip.tsx`       | Tabs filtered by `isModuleEnabled()`                                                             |
| `app/cprs/chart/[dfn]/[tab]/page.tsx`    | Module gating: disabled modules show "disabled by facility" message                              |
| `app/cprs/settings/preferences/page.tsx` | "Reset to Facility Defaults" button                                                              |
| `components/cprs/panels/NotesPanel.tsx`  | Note templates merged: facility-managed + local fallbacks                                        |
| `app/cprs/admin/integrations/page.tsx`   | Integration connector status panel (admin-only)                                                  |

## Admin API Endpoints

All `/admin/` endpoints (except `/admin/my-tenant`) require admin role.

### Tenants

- `GET /admin/tenants` — list all tenants
- `GET /admin/tenants/:tenantId` — get single tenant
- `PUT /admin/tenants/:tenantId` — create/update tenant
- `DELETE /admin/tenants/:tenantId` — delete tenant (cannot delete "default")

### Feature Flags

- `GET /admin/feature-flags/:tenantId` — get feature flags
- `PUT /admin/feature-flags/:tenantId` — partial merge update flags

### UI Defaults

- `GET /admin/ui-defaults/:tenantId` — get UI defaults
- `PUT /admin/ui-defaults/:tenantId` — partial merge update defaults

### Enabled Modules

- `GET /admin/modules/:tenantId` — get enabled modules list
- `PUT /admin/modules/:tenantId` — update enabled modules (body: `{modules: [...]}`)

### Note Templates

- `GET /admin/templates/:tenantId` — list templates
- `PUT /admin/templates/:tenantId/:templateId` — upsert template
- `DELETE /admin/templates/:tenantId/:templateId` — delete template

### Connectors/Integrations

- `GET /admin/integrations/:tenantId` — list connectors with status
- `POST /admin/integrations/:tenantId/probe` — probe all connector health

### Client Tenant Config (any authenticated user)

- `GET /admin/my-tenant` — get current user's tenant config (safe subset only)

## TenantConfig Schema

```typescript
interface TenantConfig {
  tenantId: string; // e.g., "default" or "facility-500"
  facilityName: string;
  facilityStation: string;
  vistaHost: string;
  vistaPort: number;
  vistaContext: string;
  enabledModules: ModuleId[]; // which tabs/modules are visible
  featureFlags: Record<string, boolean>;
  uiDefaults: UIDefaults; // theme, density, layoutMode, initialTab, enableDragReorder
  noteTemplates: NoteTemplate[];
  connectors: ConnectorConfig[];
  createdAt: string;
  updatedAt: string;
}
```

## Feature Flag IDs

| Flag                      | Controls                                       |
| ------------------------- | ---------------------------------------------- |
| `notes.templates`         | Whether facility note templates override local |
| `orders.sign`             | Order signing capability                       |
| `orders.release`          | Order release capability                       |
| `imaging.viewer`          | Imaging viewer integration                     |
| `rpc.console`             | RPC console access                             |
| `write-backs.enabled`     | All write-back operations                      |
| `drag-reorder.coversheet` | Cover sheet drag reorder                       |
| `remote-data.enabled`     | Remote data viewer integration                 |

## Module IDs (for `enabledModules`)

`cover`, `problems`, `meds`, `orders`, `notes`, `consults`, `surgery`,
`dcsumm`, `labs`, `reports`, `vitals`, `allergies`, `imaging`

## Testing Manually

### 1. Check tenant config

```bash
# Get current user's tenant (requires session cookie)
curl -b cookies.txt http://127.0.0.1:3001/admin/my-tenant

# Admin: list all tenants
curl -b cookies.txt http://127.0.0.1:3001/admin/tenants
```

### 2. Update feature flags (admin)

```bash
curl -X PUT -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"surgery": false}' \
  http://127.0.0.1:3001/admin/feature-flags/default
```

### 3. Disable a module (admin)

```bash
curl -X PUT -b cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"modules":["cover","problems","meds","orders","notes","labs","reports"]}' \
  http://127.0.0.1:3001/admin/modules/default
```

### 4. Probe integrations (admin)

```bash
curl -X POST -b cookies.txt \
  http://127.0.0.1:3001/admin/integrations/default/probe
```

### 5. Reset preferences to facility defaults

Navigate to `/cprs/settings/preferences`, click "Reset to Facility Defaults".

## Notes

- Default tenant is auto-seeded from environment variables on startup.
- The `tenantId` is stored in each session and resolved from `facilityStation`.
- Feature gating: disabled modules are hidden from tabs but route still exists — shows "Module Disabled" message.
- Note templates: facility-managed templates take priority; local fallbacks fill gaps.
- Production: swap in-memory TenantStore for database/config-service backed store.
