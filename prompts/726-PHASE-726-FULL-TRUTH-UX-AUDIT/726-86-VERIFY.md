# Phase 726-86 Verify - Branding Slice

## Goal

Verify `/cprs/admin/branding` against the live branding and UI-defaults APIs on the canonical VEHU stack, confirm the page state is truthful, and record only evidence-backed results.

## Verify Steps

1. Confirm Docker and the canonical API are healthy:
	- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate as `PRO1234 / PRO1234!!` and open `/cprs/admin/branding`.
3. Corroborate the browser page against its live branding and UI-defaults routes.
4. Verify at least one meaningful interaction path such as tab switching or a low-risk save/reset flow if appropriate.
5. If the browser reveals a real truth defect, fix it and re-run the live proof on the same stack.
6. Update the Phase 726 artifact, runtime override ledger, ops summary, and notion status only after the slice is browser-proven.
7. Regenerate:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`# Phase 726-86 Verify - Analytics Slice

## Goal

Verify `/cprs/admin/analytics` against the live analytics routes on the canonical VEHU stack, confirm the page state is truthful, and record only evidence-backed results.

## Verify Steps

1. Confirm Docker and the canonical API are healthy:
	- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
	- `curl.exe -s http://127.0.0.1:3001/health`
	- `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Authenticate as `PRO1234 / PRO1234!!` and open `/cprs/admin/analytics`.
3. Corroborate the browser page against its live backing routes.
4. Verify at least one meaningful interaction path such as tab switching, event filtering, or aggregation when safe.
5. If the browser reveals a real truth defect, fix it and re-run the live proof on the same stack.
6. Update the Phase 726 artifact, runtime override ledger, ops summary, and notion status only after the slice is browser-proven.
7. Regenerate:
	- `pnpm audit:ui-estate:runtime`
	- `pnpm audit:ui-estate:truth`