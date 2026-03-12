# Phase 726 - Full Truth And UX Audit - VERIFY 94

## Verification Steps
1. Confirm `vehu` and `ve-platform-db` are healthy and the canonical API responds cleanly on `/health` and `/vista/ping`.
2. Open `/patient-search` in an authenticated browser session and verify search, row selection, and chart-open behavior against live `default-patient-list` and `patient-search` route data.
3. Open `/chart/46/cover` in an authenticated browser session and verify the patient banner, chart tabs, and at least one live panel against the canonical VEHU routes.
4. Navigate to at least one additional legacy chart tab and verify row-level or tab-level interactivity is live rather than decorative.
5. If the legacy alias routes diverge from truthful behavior, fix the defect and repeat the browser proof plus API corroboration.
6. Regenerate the runtime audit checklist and truth matrix if the alias surfaces are newly proven.
7. Validate the touched files for diagnostics errors.

## Acceptance Criteria
1. `/patient-search` is either browser-proven as a truthful alias or fixed so it no longer diverges from live search behavior.
2. `/chart/46/cover` plus at least one additional legacy chart tab are browser-proven as truthful aliases or fixed at the root cause.
3. Phase 726 artifacts and runtime audit state are updated only with evidence-backed alias-route findings.