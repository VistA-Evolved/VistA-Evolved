# Phase 63 — Scheduling v1 (VistA SD\* First) + Portal Appointments

## User Request

Close the Phase 61 scheduling gap by implementing real scheduling flows
using VistA Scheduling capabilities (SD\* RPCs / files) as discovered from
Vivian + live rpc-catalog. No parallel scheduling engine.

## DoD

- A) Appointment list is real (clinic + provider + patient views)
- B) Appointment booking or request flow is real OR honest-pending with explicit target RPCs
- C) Cancel/reschedule supported OR pending with explicit targets
- D) No double-booking: server-side locking/idempotency
- E) Portal: patient can view appointments and submit requests
- F) Dead clicks = 0 for scheduling UI

## Implementation Steps

### Step 0 — Prompt capture

- [x] Create prompts/68-PHASE-63-SCHEDULING-V1/63-01-IMPLEMENT.md

### Step 1 — Inventory

- [x] Scan Vivian snapshot: 511 SD\* RPCs in Vivian, 41 in sandbox
- [x] Key sandbox RPCs: SDOE LIST ENCOUNTERS FOR PAT, SDOE GET GENERAL DATA,
      DVBAB APPOINTMENT LIST, SC BLD PAT APT LIST, SD W/L RETRIVE HOSP LOC(#44)
- [x] Existing adapters: scheduling/vista-adapter.ts (hollow placeholder)
- [x] Existing portal appointments: services/portal-appointments.ts (in-memory)
- [x] Module config exists at config/modules.json (scheduling module)

### Step 2A — SD Plan Builder

- scripts/scheduling/buildSdPlan.ts → artifacts/phase63/sd-plan.json
- Scans Vivian for SD*/SDOE*/SDEC*/SC* RPCs
- Cross-references with sandbox rpc_present.json
- Classifies by capability (list, book, cancel, slots, clinics)

### Step 2B — API Routes

- apps/api/src/routes/scheduling/index.ts — route file
- GET /scheduling/appointments?dfn=X — patient appointments (SDOE)
- GET /scheduling/appointments/provider?duz=X — provider appointments
- GET /scheduling/clinics — clinic list (SD W/L RETRIVE HOSP LOC)
- GET /scheduling/slots?clinicIen=X&date=Y — availability
- POST /scheduling/appointments/request — request appointment
- POST /scheduling/appointments/:id/cancel — cancel
- POST /scheduling/appointments/:id/reschedule — reschedule
- All writes audit to immutable-audit (no PHI)

### Step 2C — Clinician UI

- apps/web/src/app/cprs/scheduling/page.tsx — scheduling dashboard
- Clinic schedule view, patient appointment list, request queue

### Step 2D — Portal UI Enhancement

- Enhance apps/portal/src/app/dashboard/appointments/page.tsx
- Wire to real /scheduling/appointments API
- Request form with specialty/clinic/date preference

### Step 2E — Verification

- scripts/verify-phase63-scheduling.ps1

### Step 3 — Verify

- Run verifier, fix issues, re-run

### Step 4 — Docs

- docs/runbooks/scheduling-vista-sd.md
- ops/phase63-summary.md + ops/phase63-notion-update.json

### Step 5 — Commit

- "Phase63: Scheduling v1 (VistA-first SD\*) + portal appointments"

## Files Touched

- prompts/68-PHASE-63-SCHEDULING-V1/63-01-IMPLEMENT.md (new)
- prompts/68-PHASE-63-SCHEDULING-V1/63-99-VERIFY.md (new)
- scripts/scheduling/buildSdPlan.ts (new)
- apps/api/src/routes/scheduling/index.ts (new)
- apps/api/src/adapters/scheduling/vista-adapter.ts (rewrite)
- apps/api/src/adapters/scheduling/interface.ts (enhance)
- apps/api/src/services/portal-appointments.ts (wire to scheduling)
- apps/api/src/index.ts (register scheduling routes)
- apps/api/src/lib/immutable-audit.ts (add scheduling audit actions)
- apps/web/src/app/cprs/scheduling/page.tsx (new)
- apps/portal/src/app/dashboard/appointments/page.tsx (enhance)
- config/capabilities.json (update scheduling capabilities)
- scripts/verify-phase63-scheduling.ps1 (new)
- scripts/verify-latest.ps1 (delegate to phase 63)
- docs/runbooks/scheduling-vista-sd.md (new)
- ops/phase63-summary.md (new)
- ops/phase63-notion-update.json (new)

## Verification Steps

- sd-plan.json generated with correct RPC inventory
- /scheduling/appointments returns real encounter data from SDOE RPCs
- /scheduling/clinics returns real clinic data from SD W/L RETRIVE HOSP LOC
- Portal appointment request flow works end-to-end
- No mock/seed data used in appointment responses
- Dead click audit: all scheduling UI elements functional
- Double-booking: server-side lock test
- verify-latest.ps1 passes
