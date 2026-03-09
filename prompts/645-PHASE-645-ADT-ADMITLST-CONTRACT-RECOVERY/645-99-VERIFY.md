# Phase 645 - ADT ADMITLST Contract Recovery Verify

## Verification Steps
1. Confirm Docker prerequisites are healthy: `vehu` and `ve-platform-db`.
2. Confirm the API is running cleanly and `/ready` returns `{"ok":true,...}`.
3. Call `GET /vista/adt/census?ward=38` and verify real inpatients now include admit date and ward metadata, plus room/bed values when present from `ORQPT WARD PATIENTS`.
4. Call `GET /vista/adt/admission-list?dfn=100708` and verify it returns at least one admission event from live `ORWPT16 ADMITLST` output.
5. Call `GET /vista/adt/movements?dfn=100708` and verify the movement timeline is populated truthfully from the same live RPC contract.
6. Re-open `/cprs/chart/46/adt`, select ward `7A GEN MED`, and verify the Selected Ward Census table shows real admit dates and ward values instead of all em dashes.
7. Verify the chart patient `DFN=46` still shows an honest empty movement/admission state if VistA returns none.

## Acceptance Criteria
- `ORWPT16 ADMITLST` rows are parsed according to the live VEHU contract rather than an outdated assumed shape.
- Selected ward census detail is no longer blank when live source data exists.
- Room/bed values come from the actual `ORQPT WARD PATIENTS` payload instead of being fabricated.
- Movement and admission-list routes return truthful live data for patients with admissions.
- The ADT UI remains explicit about integration-pending write posture and does not fake unsupported transfer/discharge history.
- All route checks are performed against the running VEHU Docker and live API.

## Files Verified
- apps/api/src/routes/adt/index.ts
- apps/api/src/routes/inpatient/index.ts
- apps/web/src/components/cprs/panels/ADTPanel.tsx
- docs/runbooks/inpatient-adt.md
