# Module Architecture -- VistA-Evolved Platform

> Phase 51: Enterprise Packaging + Module Marketplace Ready Architecture

## Overview

VistA-Evolved uses a **module manifest system** that enables marketplace-ready
packaging. Each module is a self-contained unit with declared dependencies,
permissions, data stores, and health checks. Modules can be toggled per-tenant,
per-SKU, or at runtime via the admin API.

## Module Manifest Schema (v2.0)

Every module is defined in `config/modules.json` with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable display name |
| `version` | string | SemVer version (e.g., `"1.0.0"`) |
| `description` | string | What the module does |
| `alwaysEnabled` | boolean | `true` only for `kernel` -- cannot be disabled |
| `routePatterns` | string[] | Regex patterns for routes owned by this module |
| `dependencies` | string[] | Other module IDs that must be enabled |
| `adapters` | string[] | Adapter types required (e.g., `"clinical-engine"`) |
| `services` | string[] | Internal service identifiers |
| `permissions` | string[] | RBAC permissions required to access this module |
| `dataStores` | DataStore[] | Data stores used by this module |
| `healthCheckEndpoint` | string | HTTP path for module health check |

### DataStore Object

```json
{
  "id": "claim-store",
  "type": "in-memory",
  "description": "Claim + remittance lifecycle store"
}
```

Supported `type` values:
- `in-memory` -- In-process Map/Set (resets on restart)
- `in-memory+jsonl` -- In-process + JSONL file sink
- `vista` -- VistA M globals via RPC broker
- `json-seed` -- Loaded from JSON files at startup
- `filesystem` -- File-based storage (e.g., export artifacts)
- `external-sql` -- External SQL database (e.g., ROcto)

## Module List (13 modules)

| ID | Name | Version | Always On | Dependencies |
|----|------|---------|-----------|-------------|
| `kernel` | Platform Kernel | 1.0.0 | Yes | none |
| `clinical` | Clinician CPRS Shell | 1.0.0 | No | kernel |
| `portal` | Patient Portal | 1.0.0 | No | kernel |
| `telehealth` | Telehealth / Video Visits | 1.0.0 | No | kernel |
| `imaging` | Imaging / PACS | 1.0.0 | No | kernel |
| `analytics` | Analytics & Reports | 1.0.0 | No | kernel |
| `interop` | Interop / HL7 / HLO | 1.0.0 | No | kernel |
| `intake` | Intake OS / Questionnaires | 1.0.0 | No | kernel |
| `ai` | AI Gateway | 1.0.0 | No | kernel |
| `iam` | IAM / OIDC / Biometrics | 1.0.0 | No | kernel |
| `rcm` | Revenue Cycle Management | 1.0.0 | No | kernel, clinical |
| `scheduling` | Scheduling | 1.0.0 | No | kernel |
| `migration` | Data Portability / Migration | 1.0.0 | No | kernel, clinical |

## SKU Profiles (7 SKUs)

SKUs are predefined module bundles set via `DEPLOY_SKU` env var:

| SKU | Included Modules |
|-----|-----------------|
| `FULL_SUITE` | All 13 modules |
| `CLINICIAN_ONLY` | kernel, clinical, analytics |
| `PORTAL_ONLY` | kernel, portal, intake |
| `TELEHEALTH_ONLY` | kernel, telehealth, portal |
| `RCM_ONLY` | kernel, clinical, rcm, analytics |
| `IMAGING_ONLY` | kernel, clinical, imaging |
| `INTEROP_ONLY` | kernel, interop, analytics |

## Runtime Enforcement

### Module Guard (Fastify onRequest hook)

The `moduleGuardHook` in `middleware/module-guard.ts` runs on every request:

1. Strip query params from URL
2. Check bypass patterns (health, auth, metrics, module/capability/adapter APIs)
3. Resolve which module owns the route via regex matching
4. Check if that module is enabled for the requesting tenant
5. If disabled: **403 Module not enabled**

This means a disabled module's routes are completely inaccessible -- they
return 403, not 404. The routes are still registered in Fastify but
blocked at the hook level.

### Dependency Validation

Before applying module override changes, the system validates all
dependencies:

```
Module 'rcm' requires 'clinical' which is not enabled
```

The API returns 400 with specific dependency errors if validation fails.

## API Endpoints

### Public (session auth)
- `GET /api/capabilities` -- resolved capabilities for tenant
- `GET /api/capabilities/summary` -- live/pending/disabled counts
- `GET /api/capabilities/by-module` -- grouped by module

### Admin (admin role checked in handler)
- `GET /api/modules/status` -- module enablement status
- `GET /api/modules/manifests` -- full module manifests (Phase 51)
- `GET /api/modules/skus` -- available SKU profiles
- `POST /api/modules/override` -- per-tenant module overrides
- `GET /api/adapters/health` -- adapter health status
- `GET /api/adapters/list` -- all loaded adapters

### Marketplace (Phase 51, admin role)
- `GET /api/marketplace/config` -- tenant marketplace config
- `PUT /api/marketplace/config` -- update tenant marketplace config
- `PATCH /api/marketplace/connectors` -- update connector settings
- `PATCH /api/marketplace/jurisdiction` -- change jurisdiction pack
- `GET /api/marketplace/jurisdictions` -- available jurisdiction packs
- `GET /api/marketplace/summary` -- marketplace summary stats

## Architecture Layers

```
                    config/modules.json
                    config/skus.json
                    config/capabilities.json
                           |
                    +--------------+
                    |  Init Layer  |  (startup)
                    +--------------+
                           |
            +--------------+--------------+
            |              |              |
    module-registry   capability-svc   adapter-loader
    (modules+SKUs)   (cap resolution)  (VistA/stub)
            |              |              |
            +--------------+--------------+
                           |
                    +--------------+
                    | module-guard  |  (onRequest hook)
                    +--------------+
                           |
                    +--------------+
                    | Fastify routes |  (registered but gated)
                    +--------------+
```

## Admin UI

The **Module Marketplace** page at `/cprs/admin/modules` provides:

1. **Modules tab** -- list all modules with version, status, dependencies,
   permissions, and data stores. Toggle enable/disable with dependency
   constraint enforcement.

2. **Connectors tab** -- view and toggle tenant connector configurations
   (clearinghouse, PACS, PhilHealth, etc.).

3. **Jurisdiction tab** -- select jurisdiction pack (US, PH, Global, Sandbox).
   Changing jurisdiction resets connector defaults.

4. **Status tab** -- marketplace summary statistics, SKU info, tenant info.

## Adding a New Module

1. Add entry to `config/modules.json` with all manifest fields
2. Add capability entries to `config/capabilities.json`
3. Add module to relevant SKU profiles in `config/skus.json`
4. Create route files and register in `index.ts`
5. Create adapter (if needed) in `apps/api/src/adapters/<type>/`
6. The module guard will automatically gate the new routes

## Security

- Module toggle is admin-only (`POST /api/modules/override`)
- `kernel` cannot be disabled (`alwaysEnabled: true`)
- Dependency validation prevents orphan modules
- Permissions are declared per module and enforced by RBAC in route handlers
- Connector secrets are NEVER stored in tenant config -- use env vars
