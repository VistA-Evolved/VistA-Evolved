# Phase 67 — ADT + Inpatient Lists v1 (VistA-FIRST, READ FIRST)

## User Request

Build hospital operations credibility with inpatient census by ward/service,
patient movement timeline (admit/transfer/discharge), and "pending" posture
for writes.

## Implementation Steps

### A. Plan

- Identify VistA ADT RPCs: ORQPT WARDS, ORQPT WARD PATIENTS, ORQPT PROVIDER PATIENTS,
  ORQPT TEAMS, ORQPT TEAM PATIENTS, ORQPT SPECIALTIES, ORQPT SPECIALTY PATIENTS,
  ORWU1 NEWLOC, ORWPT16 ADMITLST
- Map to endpoints under `/vista/adt/*`
- VistA-first: show real data or explicit pendingTargets, no fake data
- Read-first: writes (admit/discharge/transfer) are integration-pending

### B. API (apps/api/src/routes/adt/index.ts)

| Endpoint                                        | RPC                          | Type          |
| ----------------------------------------------- | ---------------------------- | ------------- |
| GET /vista/adt/wards                            | ORQPT WARDS                  | read          |
| GET /vista/adt/ward-patients?ward=IEN           | ORQPT WARD PATIENTS          | read          |
| GET /vista/adt/provider-patients                | ORQPT PROVIDER PATIENTS      | read          |
| GET /vista/adt/teams                            | ORQPT TEAMS                  | read          |
| GET /vista/adt/team-patients?team=IEN           | ORQPT TEAM PATIENTS          | read          |
| GET /vista/adt/specialties                      | ORQPT SPECIALTIES            | read          |
| GET /vista/adt/specialty-patients?specialty=IEN | ORQPT SPECIALTY PATIENTS     | read          |
| GET /vista/adt/locations?search=TEXT            | ORWU1 NEWLOC                 | read          |
| POST /vista/adt/admit                           | (pending) DGPM NEW ADMISSION | write-pending |
| POST /vista/adt/transfer                        | (pending) DGPM NEW TRANSFER  | write-pending |
| POST /vista/adt/discharge                       | (pending) DGPM NEW DISCHARGE | write-pending |

### C. UI (apps/web/src/components/cprs/panels/ADTPanel.tsx)

- Tab: "ADT" in CPRS chart, tab slug `adt`
- Sub-tabs: Ward Census | Provider Patients | Team Patients | Specialty
- Ward Census: dropdown of wards, patient list table
- Integration-pending banners for write actions

### D. Tests / Verification

- scripts/verify-phase67-adt.ps1 (OSv3 gates)
- Register in verify-latest.ps1
- TSC clean

## Verification Steps

- All 8 read endpoints return structured JSON with rpcUsed / pendingTargets
- 3 write endpoints return 202 with vistaGrounding
- ADTPanel renders with ward selector and patient table
- Tab wired in chart page, VALID_TABS, tab strip
- RPC registry has 9 new ADT RPCs
- Action registry has ADT actions
- Capabilities.json has clinical.adt.\* entries
- TSC clean (zero errors)
- verify-phase67-adt.ps1 passes

## Files Touched

- prompts/73-PHASE-67-ADT-INPATIENT/73-01-IMPLEMENT.md (this file)
- prompts/73-PHASE-67-ADT-INPATIENT/73-99-VERIFY.md
- artifacts/phase67/adt-plan.json
- apps/api/src/routes/adt/index.ts (NEW)
- apps/api/src/index.ts (add import + register)
- apps/api/src/vista/rpcRegistry.ts (add ADT RPCs)
- apps/web/src/components/cprs/panels/ADTPanel.tsx (NEW)
- apps/web/src/components/cprs/panels/index.ts (add export)
- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx (add adt tab)
- apps/web/src/actions/actionRegistry.ts (add ADT actions)
- apps/web/src/lib/contracts/data/tabs.json (add ADT tab)
- config/capabilities.json (add clinical.adt.\*)
- config/modules.json (add ADT route patterns)
- scripts/verify-phase67-adt.ps1 (NEW)
- scripts/verify-latest.ps1 (update delegate)
