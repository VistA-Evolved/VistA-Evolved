# Migration Toolkit -- Architecture & Usage

> **Phase 50 -- Data Portability & Migration Foundation**

## Overview

The Migration Toolkit enables importing data from external EHR systems and
exporting data from VistA-Evolved. It is designed as a pluggable framework
where new source formats require only a mapping template, not new code.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Migration Console (UI)                  │
│    Upload CSV → Validate → Dry-Run → Import → Rollback   │
│    Create Export → Run → Download (encrypted optional)    │
└────────────────┬─────────────────────────────────────────┘
                 │ REST API (/migration/*)
┌────────────────▼─────────────────────────────────────────┐
│                 migration-routes.ts                        │
│   Job CRUD, pipeline orchestration, RBAC enforcement      │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Import       │  │ Export       │  │ Mapping Engine  │ │
│  │ Pipeline     │  │ Pipeline     │  │ (DSL/Config)    │ │
│  │              │  │              │  │                 │ │
│  │ validate()   │  │ patient-     │  │ parseCsv()      │ │
│  │ dryRun()     │  │ summary      │  │ applyTransforms │ │
│  │ runImport()  │  │ audit-export │  │ validateData()  │ │
│  │              │  │ clinical-    │  │ mapRow()        │ │
│  │              │  │ data         │  │                 │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                    │          │
│  ┌──────▼─────────────────▼────────────────────▼────────┐ │
│  │              migration-store.ts                       │ │
│  │  Jobs (Map)  |  Templates (Map)  |  Rollbacks (Map)  │ │
│  │              In-memory (sandbox)                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              templates.ts (8 built-in)                │ │
│  │  generic-csv: patient/problem/med/allergy/appointment │ │
│  │  openemr-csv: patient/allergy                        │ │
│  │  fhir-bundle: patient (placeholder)                  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Import Pipeline

### Flow

1. **Create Job** -- Upload CSV, select entity type + source format + template
2. **Validate** -- Parse CSV, check required fields, pattern validation, preview
3. **Dry-Run** -- Simulate import, show create/update/skip counts per row
4. **Import** -- Execute the import (sandbox: simulated entity creation)
5. **Rollback** -- Mark created entities as rolled back (when available)

### Status Machine

```
created → validating → validated → dry-run → dry-run-complete → importing → imported → rolled-back
                     ↘ validation-failed (retry → validating)
                                                             ↘ import-failed (retry → created)
```

## Export Pipeline

### Supported Bundle Types

| Type | Description | Data Source |
|------|------------|-------------|
| `patient-summary` | Patient demographics + clinical sections | VistA RPCs (integration-pending in sandbox) |
| `audit-export` | Immutable audit trail entries | Audit store |
| `clinical-data` | Multi-domain clinical data | VistA RPCs (integration-pending) |

### Encryption

Set `MIGRATION_EXPORT_KEY` env var to enable AES-256-GCM encryption.
Without it, exports are plain Base64-encoded JSON.

**Format:** IV (12 bytes) + AuthTag (16 bytes) + Ciphertext, Base64-encoded.

## Mapping Engine

### Field Mapping DSL

Each mapping template defines field-level transformations:

```json
{
  "source": "last_name",
  "target": "lastName",
  "required": true,
  "transforms": [
    { "fn": "uppercase" },
    { "fn": "trim" }
  ],
  "validationPattern": "^[A-Z]"
}
```

### Available Transforms

| Transform | Description | Args |
|-----------|------------|------|
| `uppercase` | Convert to uppercase | -- |
| `lowercase` | Convert to lowercase | -- |
| `trim` | Trim whitespace | -- |
| `date-iso8601` | Parse date to ISO 8601 | -- |
| `date-mmddyyyy` | Parse MM/DD/YYYY to YYYY-MM-DD | -- |
| `date-yyyymmdd` | Parse YYYYMMDD to YYYY-MM-DD | -- |
| `split-first` | First element after split | `separator` |
| `split-last` | Last element after split | `separator` |
| `default` | Default value if empty | `default` |
| `map-value` | Map discrete values | key→value pairs |
| `concat` | Add prefix/suffix | `prefix`, `suffix` |
| `regex-extract` | Extract via regex group | `pattern` |
| `number` | Parse to number | -- |
| `boolean` | Parse to boolean | -- |

### Custom Templates

Create via `POST /migration/templates`:

```json
{
  "id": "my-clinic-patients",
  "name": "My Clinic Patient CSV",
  "sourceFormat": "custom",
  "entityType": "patient",
  "version": "1.0.0",
  "fields": [
    { "source": "PatLast", "target": "lastName", "required": true, "transforms": [{"fn": "uppercase"}] },
    { "source": "PatFirst", "target": "firstName", "required": true }
  ]
}
```

## RBAC

| Permission | Roles | Description |
|-----------|-------|-------------|
| `migration:read` | admin | View jobs, templates, stats |
| `migration:write` | admin | Create jobs, upload files |
| `migration:admin` | admin | Run imports, exports, rollback, manage templates |

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/migration/health` | migration:read | Health + stats |
| GET | `/migration/stats` | migration:read | Detailed stats |
| GET | `/migration/templates` | migration:read | List all templates |
| GET | `/migration/templates/:id` | migration:read | Get template detail |
| POST | `/migration/templates` | migration:admin | Create custom template |
| DELETE | `/migration/templates/:id` | migration:admin | Delete template |
| GET | `/migration/jobs` | migration:read | List jobs (filterable) |
| GET | `/migration/jobs/:id` | migration:read | Get job detail |
| POST | `/migration/jobs/import` | migration:admin | Create import job |
| POST | `/migration/jobs/export` | migration:admin | Create export job |
| POST | `/migration/jobs/:id/validate` | migration:admin | Validate uploaded data |
| POST | `/migration/jobs/:id/dry-run` | migration:admin | Simulate import |
| POST | `/migration/jobs/:id/run` | migration:admin | Execute import or export |
| GET | `/migration/jobs/:id/rollback-plan` | migration:admin | View rollback plan |
| POST | `/migration/jobs/:id/rollback` | migration:admin | Execute rollback |
| DELETE | `/migration/jobs/:id` | migration:admin | Delete job |

## Environment Variables

| Var | Default | Description |
|-----|---------|-------------|
| `MIGRATION_EXPORT_KEY` | (empty) | AES-256-GCM encryption key for exports |

## PHI Safety

- All exports can be encrypted with AES-256-GCM
- Migration routes require admin-only RBAC (`migration:admin`)
- Every mutation is logged to immutable audit trail
- Raw CSV data is held in-memory only (never written to disk)
- Export data is Base64-encoded (or encrypted) in transit
- SSN fields have validation patterns but are never logged
- No PHI in job metadata visible in list views (rawData stripped)

## Sandbox Limitations

- Import creates simulated entity IDs (no VistA write-backs)
- Export bundles contain placeholder data (VistA RPCs not called)
- Stores are in-memory, reset on API restart
- Max 500 jobs retained

## Production Migration Path

1. Import pipeline: replace simulated creation with VistA write-back RPCs
2. Export pipeline: call actual VistA RPCs for patient data aggregation
3. Store: move job state to persistent storage (VistA FileMan or PostgreSQL)
4. Templates: add institution-specific mapping templates
5. FHIR: implement full FHIR R4 Bundle import/export
