# Phase 563 (W41-P6): Verify DSAR + Bulk Export PG

## Verification Steps
1. `tsc --noEmit` — zero TS errors
2. dsar-store.ts exports initDsarStoreRepo and rehydrateDsarStore
3. data-portability.ts exports initBulkExportRepo and rehydrateBulkExportJobs
4. lifecycle.ts W41 block imports and wires both stores
5. persistDsarRequest fires on createDsarRequest and transitionDsar
6. persistBulkExportJob fires on kickoffBulkExport and processBulkExport
7. store-policy.ts dsar-requests and bulk-export-jobs entries are pg_write_through
8. dsar_request and bulk_export_job tables in v58 migration with JSONB columns

## Pass Criteria
- Zero TS errors
- DSAR: write-through on 2 mutation paths + rehydration with JSON parse
- Export: write-through on 2 mutation paths + rehydration with JSON parse
