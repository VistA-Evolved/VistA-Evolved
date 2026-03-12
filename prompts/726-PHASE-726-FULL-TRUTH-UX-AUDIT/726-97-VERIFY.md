# Phase 726-97 Verify - Audit Viewer Slice

## Goal

Verify that `/cprs/admin/audit-viewer` is browser-proven against the live immutable-audit APIs on the canonical VEHU stack and that any discovered truth defect is fixed end to end.

## Verification Steps

1. Confirm `http://127.0.0.1:3001/health` returns `ok:true`.
2. Confirm the browser is authenticated as `PROGRAMMER,ONE`.
3. Open `/cprs/admin/audit-viewer` and record the rendered Events view.
4. Corroborate the browser events table against the live events endpoint.
5. Corroborate the browser stats view against the live stats endpoint.
6. Corroborate the browser chain-verification view against the live verify endpoint.
7. Exercise at least one filtering or tab interaction and confirm the browser response remains aligned with live route data.
8. Regenerate the runtime audit checklist and truth matrix after the slice is recorded.

## Acceptance Criteria

- The audit-viewer page renders live immutable-audit data rather than placeholder content.
- Browser-visible counts and rows match the live API route payloads used by the page.
- Any hash-chain verification or integrity status shown in the UI matches the live verify endpoint.
- No stale label, fake success state, or fabricated data remains on the audited slice.
- The Phase 726 browser audit artifact records the slice and the runtime audit outputs mark the surface `browser-proven`.