# Phase 245 — Data Exports v2 (Wave 6 P8)

## User Request

Unified export orchestration layer that consolidates the scattered CSV/JSON
export paths (analytics, reporting, imaging audit, RCM, payments) into a
single export engine with background job processing, streaming output,
progress tracking, and JSONL format support.

## Implementation Steps

1. Create `apps/api/src/exports/export-engine.ts` — unified streaming export
   engine with background job queue, progress callbacks, and format dispatch
2. Create `apps/api/src/exports/export-formats.ts` — CSV, JSON, JSONL, and
   NDJSON format writers with streaming interface
3. Create `apps/api/src/exports/export-sources.ts` — pluggable data source
   registry (analytics, audit, RCM, clinical, platform)
4. Create `apps/api/src/routes/export-routes.ts` — unified export REST API
5. Create `apps/web/src/app/cprs/admin/exports/page.tsx` — export dashboard UI
6. Wire routes into `register-routes.ts`
7. Add "Exports" to admin layout nav
8. Create verification script

## Verification Steps

- All 5 source files exist with required exports
- Routes registered in register-routes.ts
- Admin page exists with export UI
- TypeScript compiles cleanly
- No console.log in new files

## Files Touched

- `apps/api/src/exports/export-engine.ts` (NEW)
- `apps/api/src/exports/export-formats.ts` (NEW)
- `apps/api/src/exports/export-sources.ts` (NEW)
- `apps/api/src/routes/export-routes.ts` (NEW)
- `apps/web/src/app/cprs/admin/exports/page.tsx` (NEW)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/web/src/app/cprs/admin/layout.tsx` (MODIFIED)
