# Phase 147 -- Scheduling Realism Pack: SDES Depth + Truth Gates (IMPLEMENT)

## Scope
Wire read/write paths to real SD/SDES RPCs where available, create optional
Z routine seeder for sandbox data, add truth gates to verify VistA writes,
and expose scheduling writeback mode indicator in portal.

## Key work

### 1. ZVESDSEED.m sandbox seeder (services/vista/ZVESDSEED.m)
- Idempotent M routine seeding clinics (File 44), appointment types (File 409.1),
  and sample appointments in ^SC and ^AUPNVSIT for DFN 3
- DEV/DEMO ONLY, clearly labeled
- Includes VERIFY entry point for checking seed results

### 2. Adapter interface expansion (interface.ts)
Added 6 types: AppointmentType, CancelReason, ClinicResource, SdesAvailSlot,
TruthGateResult, SchedulingMode.
Added 6 methods: getAppointmentTypes, getCancelReasons, getClinicResource,
getSdesAvailability, verifyAppointment, getSchedulingMode.

### 3. VistA adapter SDES depth (vista-adapter.ts)
- getAppointmentTypes() -> SDES GET APPT TYPES
- getCancelReasons() -> SDES GET CANCEL REASONS
- getClinicResource() -> SDES GET RESOURCE BY CLINIC
- getSdesAvailability() -> SDES GET CLIN AVAILABILITY
- verifyAppointment() -> SDES GET APPT BY APPT IEN + SDOE fallback (truth gate)
- getSchedulingMode() -> probes SDES/SDOE/SDWL/SDVW availability
- getRpcPosture() expanded with 10 SDES RPC entries

### 4. Scheduling routes (6 new endpoints, 31 total)
- GET /scheduling/appointment-types
- GET /scheduling/cancel-reasons
- GET /scheduling/clinic/:ien/resource
- GET /scheduling/sdes-availability?clinicIen=&startDate=&endDate=
- GET /scheduling/verify/:ref?dfn=  (truth gate)
- GET /scheduling/mode  (writeback mode indicator)

### 5. Portal UX (appointments/page.tsx)
- Scheduling mode badge: shows "VistA Direct Scheduling", "SDES Scheduling (Partial)",
  or "Request Only (Clinic Confirms)" based on live mode probe.

### 6. RPC registry (rpcRegistry.ts)
- Added 19 new RPCs: ORWPT APPTLST, SDVW x2, SD W/L x3, SDES x11
- Added 19 matching RPC_EXCEPTIONS entries

### 7. Immutable audit
- Added scheduling.truth_gate action type

## Files touched
- services/vista/ZVESDSEED.m (created)
- apps/api/src/adapters/scheduling/interface.ts
- apps/api/src/adapters/scheduling/stub-adapter.ts
- apps/api/src/adapters/scheduling/vista-adapter.ts
- apps/api/src/routes/scheduling/index.ts
- apps/api/src/vista/rpcRegistry.ts
- apps/api/src/lib/immutable-audit.ts
- apps/portal/src/app/dashboard/appointments/page.tsx

## Constraints
- VistA-first: all scheduling data grounded in VistA SD/SDES files
- Truth gate verifies appointment presence in VistA before claiming success
- SDES RPCs installed in sandbox but may need seeded data (ZVESDSEED.m)
- No fake appointment data created in API stores without VistA backing
