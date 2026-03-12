# Phase 726-98 Verify - Modules Slice

## Goal

Verify that `/cprs/admin/modules` is browser-proven against the live module-entitlement and capability APIs on the canonical VEHU stack and that any discovered truth defect is fixed end to end.

## Verification Steps

1. Confirm `http://127.0.0.1:3001/health` returns `ok:true`.
2. Confirm the browser is authenticated as `PROGRAMMER,ONE`.
3. Open `/cprs/admin/modules` and record the rendered default tab.
4. Corroborate the browser module catalog/entitlement state against the live admin module routes.
5. Corroborate any feature-flag or capability tables against the live routes the page calls.
6. Exercise at least one browser interaction and confirm the page remains aligned with live route data.
7. Regenerate the runtime audit checklist and truth matrix after the slice is recorded.

## Acceptance Criteria

- The modules page renders live admin module data rather than placeholder content.
- Browser-visible counts, statuses, and rows match the live admin routes used by the page.
- Any interactive filter, tab, or stateful control exercised during the pass behaves truthfully.
- No stale labels, fabricated statuses, or silent dead-clicks remain on the audited slice.
- The Phase 726 browser audit artifact records the slice and the runtime audit outputs mark the surface `browser-proven`.