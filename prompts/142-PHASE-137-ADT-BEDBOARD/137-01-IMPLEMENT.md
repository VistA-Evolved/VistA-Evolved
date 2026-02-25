# Phase 137 — ADT + Bedboard + Census (VistA-First)

## User Request
Build inpatient operational views: wards, rooms/beds, census lists, admission/discharge/transfer events visibility. VistA is source of truth.

## Implementation Steps

### A) RPC Discovery
Existing RPCs already in registry (Phase 67):
- `ORQPT WARDS` — ward list
- `ORQPT WARD PATIENTS` — patients by ward
- `ORWPT16 ADMITLST` — admission history
- `ORQPT PROVIDER PATIENTS` — provider patient list
- `ORQPT TEAMS` / `ORQPT TEAM PATIENTS` — team lists
- `ORQPT SPECIALTIES` / `ORQPT SPECIALTY PATIENTS` — specialty lists
- `ORWU1 NEWLOC` — location search

Missing (no standard RPC):
- Bed-level data (ROOM-BED 405.4)
- Movement history (PATIENT MOVEMENT 405)
- Ward census with bed counts in single call

### B) Custom M routine: ZVEADT.m
- `WARDS^ZVEADT` — ward census with bed counts (single call, replaces N+1)
- `BEDS^ZVEADT` — bed-level occupancy for a ward
- `MVHIST^ZVEADT` — movement history for a patient (File 405)

### C) API route enhancements
- `GET /vista/adt/census?ward=IEN` — ward census (delegates to existing inpatient routes)
- `GET /vista/adt/movements?dfn=N` — movement history (delegates to existing route)
- Add immutable audit logging to ALL inpatient/ADT read routes (HIPAA)
- Add capabilities for census/bedboard/movements

### D) UI pages
- `/inpatient/bedboard` — dedicated bedboard page
- `/inpatient/census` — dedicated census page
- Both leverage existing `/cprs/inpatient` patterns

### E) PG-backed preferences
- Ward layout preferences in existing tenant-aware PG (ui_prefs)

## Verification Steps
- API routes return VistA data or integration-pending
- UI shows real ward/patient data
- Audit trail records census access
- TypeScript clean, tests pass

## Files Touched
- apps/api/src/routes/adt/index.ts (add census + movements aliases)
- apps/api/src/routes/inpatient/index.ts (add audit logging)
- apps/web/src/app/inpatient/bedboard/page.tsx (new)
- apps/web/src/app/inpatient/census/page.tsx (new)
- services/vista/ZVEADT.m (new M routine)
- config/capabilities.json (add census/bedboard/movements)
- apps/api/src/platform/store-policy.ts (add inpatient entries if any)
- prompts/142-PHASE-137-ADT-BEDBOARD/ (prompt files)
