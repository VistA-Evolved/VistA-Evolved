# Phase 563 (W41-P6): DSAR + Bulk Export PG

## User Request
Wire dsar-store.ts and data-portability.ts to PG for restart-safe DSAR processing and bulk export resumability.

## Implementation Steps
1. Create DsarRepo and ExportRepo interfaces
2. Add lazy repo variables for both stores
3. Implement initDsarStoreRepo(), rehydrateDsarStore(), persistDsarRequest()
4. Implement initBulkExportRepo(), rehydrateBulkExportJobs(), persistBulkExportJob()
5. Wire persist into createDsarRequest(), transitionDsar()
6. Wire persist into kickoffBulkExport(), processBulkExport()
7. JSON parse handling for statusHistory, metadata, resourceTypes, outputFiles, manifest on rehydration
8. Wire in lifecycle.ts W41 block
9. Created dsar_request and bulk_export_job PG tables in v58 migration

## Files Touched
- apps/api/src/services/dsar-store.ts (PG wiring + persist calls)
- apps/api/src/exports/data-portability.ts (PG wiring + persist calls)
- apps/api/src/platform/pg/pg-migrate.ts (v58 migration)
- apps/api/src/server/lifecycle.ts (W41 wiring block)
- apps/api/src/platform/store-policy.ts (2 entries updated)

## Notes
- dsar_request: status_history and metadata stored as JSONB
- bulk_export_job: resource_types, output_files, manifest stored as JSONB
