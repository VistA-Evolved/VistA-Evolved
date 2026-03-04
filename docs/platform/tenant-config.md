# Tenant Configuration -- VistA-Evolved Platform

> Phase 51: Enterprise Packaging + Module Marketplace Ready Architecture

## Overview

VistA-Evolved supports multi-tenant configuration at two granularity levels:

1. **System-level modules** (Phase 37C + Phase 51) -- coarse toggles for
   entire subsystems (clinical, imaging, RCM, etc.)
2. **Tab-level modules** (Phase 17A) -- fine-grained toggles within the
   clinical CPRS shell (problems, meds, notes, etc.)

This document covers the Phase 51 **marketplace tenant configuration** which
manages system-level module enablement, connector settings, and jurisdiction
pack selection.

## Configuration Layers

```
[1] DEPLOY_SKU env var        (cluster-wide default)
      |
[2] config/skus.json          (SKU → module mapping)
      |
[3] Per-tenant overrides      (in-memory, admin API)
      |
[4] Marketplace tenant config (connectors, jurisdiction)
      |
[5] Tab-level tenant config   (CPRS tab toggles, UI prefs)
```

Layer 1-2 set the baseline. Layer 3-4 allow per-tenant customization via
the admin API. Layer 5 controls CPRS UI details.

## Marketplace Tenant Config Schema

```typescript
interface MarketplaceTenantConfig {
  tenantId: string; // Unique tenant ID
  facilityName: string; // Human-readable name
  jurisdiction: JurisdictionPack; // Regulatory context
  enabledModules: string[]; // System-level module IDs
  connectors: ConnectorConfig[]; // Connector configurations
  customSettings: Record<string, string | number | boolean>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

## Jurisdiction Packs

Jurisdiction packs set regulatory defaults, connector templates, and
locale-specific settings for a tenant.

| Pack      | Name             | Description                                            |
| --------- | ---------------- | ------------------------------------------------------ |
| `us`      | United States    | HIPAA, CMS billing, X12 5010 EDI, US clearinghouses    |
| `ph`      | Philippines      | PhilHealth eClaims, DOH reporting, Philippine HMOs     |
| `global`  | Global / Generic | Minimal regulatory assumptions, adaptable              |
| `sandbox` | Sandbox / Dev    | All features, simulated connectors, relaxed validation |

### What a jurisdiction pack sets:

- **Default connectors** -- pre-configured integrations for the market
- **Custom settings** -- currency, date format, regulatory flags
- **Validation rules** -- claim validation strictness (future)

### Changing jurisdiction

Changing a tenant's jurisdiction **resets** connector settings and custom
settings to the new pack's defaults. This is intentional -- connectors are
market-specific.

## Connector Configuration

Connectors represent external integrations (clearinghouses, PACS, etc.):

```typescript
interface ConnectorConfig {
  type: string; // e.g., "clearinghouse", "pacs", "philhealth"
  name: string; // Display name
  enabled: boolean; // Active toggle
  settings: Record<string, string | number | boolean>; // Non-secret config
}
```

### Secret Management

**Connector secrets are NEVER stored in tenant config.** Secrets (API keys,
tokens, certificates) are managed via environment variables:

| Env Var                         | Purpose                               |
| ------------------------------- | ------------------------------------- |
| `PHILHEALTH_API_TOKEN`          | PhilHealth eClaims API authentication |
| `CLEARINGHOUSE_API_KEY`         | EDI clearinghouse API key             |
| `IMAGING_INGEST_WEBHOOK_SECRET` | Orthanc webhook auth                  |
| `OIDC_CLIENT_SECRET`            | OIDC provider client secret           |

This ensures:

- No secrets in git (`.env.local` is git-ignored)
- No secrets in API responses
- Secrets can be rotated without tenant config changes

## API Reference

### Get tenant config

```
GET /api/marketplace/config?tenantId=default
Authorization: session cookie (admin role)
```

### Update tenant config

```
PUT /api/marketplace/config
Content-Type: application/json
{
  "tenantId": "default",
  "facilityName": "Metro Hospital",
  "jurisdiction": "us",
  "enabledModules": ["kernel", "clinical", "rcm", "analytics"]
}
```

### Update connectors only

```
PATCH /api/marketplace/connectors
Content-Type: application/json
{
  "tenantId": "default",
  "connectors": [
    { "type": "clearinghouse", "name": "US EDI", "enabled": true, "settings": {...} }
  ]
}
```

### Change jurisdiction

```
PATCH /api/marketplace/jurisdiction
Content-Type: application/json
{
  "tenantId": "default",
  "jurisdiction": "ph"
}
```

### List jurisdiction packs

```
GET /api/marketplace/jurisdictions
```

### Summary stats

```
GET /api/marketplace/summary
```

## Default Tenant

A `"default"` tenant is automatically seeded at startup from environment
variables:

| Env Var               | Default                 | Description              |
| --------------------- | ----------------------- | ------------------------ |
| `DEPLOY_SKU`          | `FULL_SUITE`            | Which SKU profile to use |
| `TENANT_JURISDICTION` | `sandbox`               | Jurisdiction pack        |
| `FACILITY_NAME`       | `VistA-Evolved Sandbox` | Facility display name    |

## Admin UI

The **Module Marketplace** page at `/cprs/admin/modules` provides a visual
interface for all tenant config operations:

- **Modules tab** -- toggle modules with dependency validation
- **Connectors tab** -- manage connector enable/disable
- **Jurisdiction tab** -- switch jurisdiction packs
- **Status tab** -- summary dashboard

## Coexistence with Phase 17A Tenant Config

The Phase 17A `tenant-config.ts` uses **tab-level** module IDs (`cover`,
`problems`, `meds`, etc.) for fine-grained CPRS UI control. The Phase 51
marketplace config uses **system-level** module IDs (`clinical`, `imaging`,
`rcm`, etc.) for coarse platform packaging.

These coexist at different granularity levels:

- System-level `clinical` module being disabled blocks ALL clinical routes
- Tab-level `problems` being disabled hides the Problems tab but other
  clinical tabs still work

Both are in-memory stores. Production deployments should swap for a
database-backed store.

## Migration Path to Production

The current implementation uses in-memory stores. For production:

1. Replace `tenantModuleOverrides` Map with database table
2. Replace `tenantConfigs` Map with database table
3. Add audit logging for all config changes (already logged to structured logger)
4. Add webhook notifications for config change events
5. Add config versioning for rollback capability
