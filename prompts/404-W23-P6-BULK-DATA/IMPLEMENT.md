# 404-01-IMPLEMENT — Bulk Data

## Phase 404 (W23-P6)

### Goal
Implement FHIR Bulk Data IG-aligned export and import job management.
Jobs progress through queued → in-progress → completed lifecycle.

### Source Files
- `apps/api/src/bulk-data/types.ts` — BulkJob, BulkJobFilter, BulkJobOutput
- `apps/api/src/bulk-data/bulk-store.ts` — Job CRUD + simulation + dashboard
- `apps/api/src/bulk-data/bulk-routes.ts` — REST endpoints
- `apps/api/src/bulk-data/index.ts` — Barrel export

### Endpoints
- GET /bulk-data/jobs[/:id]
- POST /bulk-data/export (creates export job, returns 202)
- POST /bulk-data/import (creates import job, returns 202)
- DELETE /bulk-data/jobs/:id (cancel)
- POST /bulk-data/jobs/:id/kick (simulate progress)
- GET /bulk-data/dashboard
