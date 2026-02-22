# Phase 50 -- Data Portability + Migration Toolkit

## User Request
Build data portability/migration foundation: import/export pipelines, pluggable mapping DSL, admin UI, docs.

## Implementation Steps

1. **Domain types** (`migration/types.ts`)
   - MigrationJob state machine, FieldMapping DSL types, ValidationResult, ImportResult, ExportResult, RollbackPlan

2. **Mapping engine** (`migration/mapping-engine.ts`)
   - CSV parser, 14 transform functions, field validation, row mapping, template merge

3. **Migration store** (`migration/migration-store.ts`)
   - In-memory job/template/rollback stores, FSM transitions, stats

4. **Import pipeline** (`migration/import-pipeline.ts`)
   - Validate → dry-run → import orchestration

5. **Export pipeline** (`migration/export-pipeline.ts`)
   - Patient summary, audit export, clinical data bundles, AES-256-GCM encryption

6. **Mapping templates** (`migration/templates.ts`)
   - 8 built-in templates: 5 generic-csv, 2 openemr-csv, 1 fhir-bundle placeholder

7. **Migration routes** (`migration/migration-routes.ts`)
   - ~16 REST endpoints, RBAC (migration:admin), audit trail

8. **RBAC permissions** -- Added migration:read/write/admin to rbac.ts

9. **Module integration** -- Added migration module to modules.json, skus.json, capabilities.json, security.ts AUTH_RULES

10. **Admin UI** (`apps/web/src/app/cprs/admin/migration/page.tsx`)
    - 4 tabs: Import Jobs, Export Jobs, Mapping Templates, Status

11. **Docs** -- migration-toolkit.md, source-connectors.md

## Verification Steps
- tsc --noEmit clean
- API starts with DEPLOY_SKU=FULL_SUITE
- GET /migration/health returns ok
- GET /migration/templates returns 8 templates
- POST import job + validate + dry-run + import cycle works
- POST export job + run export works
- RBAC blocks non-admin access
- docs/ files exist

## Files Touched

### New files
- `apps/api/src/migration/types.ts`
- `apps/api/src/migration/mapping-engine.ts`
- `apps/api/src/migration/migration-store.ts`
- `apps/api/src/migration/import-pipeline.ts`
- `apps/api/src/migration/export-pipeline.ts`
- `apps/api/src/migration/templates.ts`
- `apps/api/src/migration/migration-routes.ts`
- `apps/web/src/app/cprs/admin/migration/page.tsx`
- `docs/migration/migration-toolkit.md`
- `docs/migration/source-connectors.md`
- `prompts/55-PHASE-50-MIGRATION-TOOLKIT/prompt.md`

### Modified files
- `apps/api/src/index.ts` -- import + register migrationRoutes
- `apps/api/src/auth/rbac.ts` -- add migration:read/write/admin permissions
- `apps/api/src/middleware/security.ts` -- add /migration/ AUTH_RULE
- `config/modules.json` -- add migration module
- `config/skus.json` -- add migration to FULL_SUITE
- `config/capabilities.json` -- add migration.* capabilities
