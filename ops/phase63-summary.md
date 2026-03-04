# Phase 63 Summary -- Scheduling v1 (VistA SD\* First) + Portal Appointments

## What Changed

### API (apps/api/)

- **Scheduling adapter** (adapters/scheduling/): Rewrote hollow Phase 37C stub
  into a real VistA adapter using SDOE and SD W/L RPCs. Includes encounter
  list parsing, clinic/provider lookup, VistA date conversion, in-memory
  request store, and double-booking lock (30s TTL per patient+clinic+date).
- **Scheduling routes** (routes/scheduling/index.ts): 10 new endpoints for
  appointments, clinics, providers, slots, request queue, and health check.
- **Portal-core.ts**: GET /portal/appointments now merges VistA encounters
  (via scheduling adapter) with legacy Phase 27 local store. Field
  normalization ensures portal UI receives expected shape.
- **CPRS wave1-routes.ts**: /vista/cprs/appointments now delegates to
  scheduling adapter instead of returning static integration-pending.
- **Immutable audit**: Added 4 scheduling audit actions (list, request,
  cancel, reschedule).
- **Security**: /scheduling/ routes require session auth.

### Web (apps/web/)

- **Clinician scheduling page** (cprs/scheduling/page.tsx): 4-tab dashboard
  (Clinic Schedule, Patient Appointments, Request Queue, Clinics & Providers).
  Fetches real data from /scheduling/\* endpoints.

### Portal (apps/portal/)

- **Appointments page**: No change needed - backend change flows through
  existing fetchAppointments().

### Scripts

- **SD plan builder** (scripts/scheduling/buildSdPlan.ts): Scans Vivian +
  sandbox for all SD*/SDOE*/SDEC*/SC* RPCs, classifies capabilities, outputs
  artifacts/phase63/sd-plan.json.
- **Verifier** (scripts/verify-phase63-scheduling.ps1): 14 gate categories,
  ~50 individual checks.

## How to Test Manually

1. Start VistA Docker: `cd services/vista && docker compose --profile dev up -d`
2. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
3. Login to get session cookie
4. Test endpoints:
   - `curl http://localhost:3001/scheduling/clinics -b cookies.txt`
   - `curl http://localhost:3001/scheduling/health -b cookies.txt`
   - `curl "http://localhost:3001/scheduling/appointments?dfn=3" -b cookies.txt`

## Verifier Output

Run: `.\scripts\verify-phase63-scheduling.ps1`

## RPC Coverage

- **Real (sandbox present)**: SDOE LIST ENCOUNTERS FOR PAT, SDOE GET GENERAL
  DATA, SDOE GET PROVIDERS, SD W/L RETRIVE HOSP LOC(#44), SD W/L RETRIVE
  PERSON(200), SDOE LIST ENCOUNTERS FOR DATES
- **Target (sandbox absent)**: SDEC APPADD, SDEC APPDEL, SDEC APPSLOTS,
  SDEC EDITAPPT, SDEC CHECKIN, SDEC CHECKOUT

## Follow-ups

1. Wire SDEC RPCs when available in production VistA
2. Add appointment detail view in clinician UI
3. Patient check-in/check-out workflow
4. Appointment reminder integration
5. Telehealth appointment type linking
