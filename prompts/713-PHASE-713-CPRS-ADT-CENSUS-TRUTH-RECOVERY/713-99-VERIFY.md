# Phase 713 - VERIFY: CPRS ADT Census Truth Recovery

## Verification Steps

1. Confirm Docker and the API are healthy, then authenticate with `PRO1234 / PRO1234!!`.
2. Call `GET /vista/adt/census` and verify it returns live ward counts from VistA.
3. Confirm the response no longer advertises `pendingTargets` for the no-ward summary path when live counts are present.
4. Open `/cprs/chart/46/adt` and verify the Ward Census Summary renders the live counts without an integration-pending banner.
5. Click a real ward such as `7A GEN MED` and verify the Selected Ward Census table still loads live patient detail.
6. Confirm the ADT movement timeline still retains truthful partial-pending posture where ZVEADT MVHIST is genuinely still required.

## Acceptance Criteria

- The ward census summary is treated as a live feature when ORQPT-backed counts are available.
- The CPRS ADT tab no longer shows a misleading integration-pending banner above functioning live ward counts.
- Ward drilldown remains live and unchanged.
- Genuine ADT partial-pending paths remain explicit where VistA depth is still incomplete.
