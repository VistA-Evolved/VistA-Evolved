# Phase 726 - Full Truth And UX Audit - VERIFY 91

## Verification Steps
1. Confirm Docker health for `vehu` and `ve-platform-db` on the canonical stack.
2. Confirm the canonical API `/health` returns `ok: true` and VistA connectivity remains healthy.
3. Authenticate to the canonical API with `PRO1234 / PRO1234!!` and capture a fresh cookie jar.
4. Call `/vista/inpatient/wards`, `/vista/inpatient/ward-census?ward=<candidate>`, and `/vista/inpatient/bedboard?ward=<candidate>` to corroborate the inpatient browser surfaces.
5. Call `/handoff/ward-patients?ward=<value>` and confirm the route returns truthful `pendingTargets` metadata when CRHD-backed ward-patient assembly is unavailable.
6. Browser-open `/inpatient/census` and verify live ward counts plus a populated ward-detail census table.
7. Browser-open `/inpatient/bedboard` and verify live occupied-bed rendering for a populated ward.
8. Browser-open `/cprs/handoff`, load a ward, and verify the create flow surfaces the integration-pending reason instead of silently implying an empty ward.
9. Update the Phase 726 browser audit artifact and ops records only after the browser proof matches the canonical API behavior.

## Acceptance Criteria
1. Inpatient census is browser-proven with live ward totals and live patient rows.
2. Bedboard is browser-proven with live occupied-bed rendering for a populated ward.
3. Handoff create flow no longer hides an integration-pending result behind a silent zero-patient state.
4. The browser audit artifact records the inpatient and handoff findings truthfully.
5. Ops records reflect the new proof state without claiming unsupported CRHD functionality.