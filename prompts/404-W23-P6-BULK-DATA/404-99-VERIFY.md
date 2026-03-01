# 404-99-VERIFY — Bulk Data

## Verification Gates
1. Types export BulkJob, BulkJobFilter, BulkResourceType
2. Export/import return 202 Accepted
3. Cancel transitions non-terminal jobs to cancelled
4. Simulate kick progresses queued→in-progress→completed with mock NDJSON outputs
5. Routes registered, AUTH_RULES for `/bulk-data/`
6. 1 STORE_INVENTORY entry
7. `tsc --noEmit` clean
