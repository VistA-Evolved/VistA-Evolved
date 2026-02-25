# Phase 131 — IMPLEMENT: Scheduling SD Depth (VistA-First Lifecycle)

## User Request
Implement real scheduling lifecycle grounded in what exists in the sandbox
(SD/SDES/SDEC). Do not invent scheduling truth outside VistA.

## Implementation Steps

### 1. VistA RPC Probe (completed)
- Scanned ^XWB(8994) for all SD/SDOE/SDEC/SDAM/SC/APPT RPCs
- **43 SD RPCs** + **68 SC/APPT RPCs** found (111 total)
- **3 clinics** in File 44: LAB DIV, DR OFFICE, SECURE MESSAGING
- **SDEC package NOT installed** — no direct booking/slot RPCs
- **SDVW MAKE APPT API APP** exists (LIST params: PATIENTN, SSN, SD1, SC, DUZ)
- **SD W/L reference data RPCs** exist but take 0 params (M functions)
- **ORWPT APPTLST** exists — returns date/location for 30-day window
- **Visit data EXISTS** in ^AUPNVSIT (encounters from 2005+)
- Probe routines: ZVESCHD.m through ZVESCHD5.m

### 2. PG Migration v14: scheduling_lifecycle table
- State machine: request→waitlisted→booked→checked_in→completed→cancelled→no_show
- Tracks VistA IEN grounding for each transition
- Tenant-aware, included in RLS policy list

### 3. PG Repo: scheduling-lifecycle-repo.ts
- CRUD for lifecycle entries
- Transition logging with actor/reason audit

### 4. Adapter Enhancement: vista-adapter.ts
- Add `getAppointmentsCprs()` wiring ORWPT APPTLST
- Add `makeAppointmentSdvw()` wiring SDVW MAKE APPT API APP
- Add `getWaitListBrief()` wiring SD W/L RETRIVE BRIEF
- Add `createDisposition()` wiring SD W/L CREATE DISPOSITION
- Add `getReferenceData()` returning SD W/L PRIORITY/TYPE/STATUS
- Integration-pending with named RPC targets where sandbox data is empty

### 5. New Routes: scheduling/index.ts additions
- GET  /scheduling/appointments/cprs — ORWPT APPTLST
- GET  /scheduling/reference-data — SD W/L lookup tables
- GET  /scheduling/lifecycle?patientDfn=X — lifecycle entries
- POST /scheduling/lifecycle/transition — lifecycle state change
- GET  /scheduling/posture — probe results + RPC inventory

### 6. UI: scheduling/page.tsx additions
- "Lifecycle" tab showing appointment state history
- "VistA Posture" tab showing RPC availability matrix

## Verification Steps
- TypeScript: `pnpm -C apps/api exec tsc --noEmit`
- Gauntlet RC: `node qa/gauntlet/cli.mjs --suite rc`
- E2E: Hit all new endpoints via curl with active session

## Files Touched
- apps/api/src/platform/pg/pg-migrate.ts (v14 migration)
- apps/api/src/platform/pg/repo/pg-scheduling-lifecycle-repo.ts (new)
- apps/api/src/adapters/scheduling/interface.ts (new types)
- apps/api/src/adapters/scheduling/vista-adapter.ts (new methods)
- apps/api/src/routes/scheduling/index.ts (new endpoints)
- apps/web/src/app/cprs/scheduling/page.tsx (new tabs)
- services/vista/ZVESCHD.m through ZVESCHD5.m (probe routines)
- prompts/135-PHASE-131-SCHEDULING-DEPTH/131-01-IMPLEMENT.md
