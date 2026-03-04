# Inpatient Operations — Runbook

> Phase 83: Census + Bedboard + ADT Workflow + Movement Timeline

## Overview

The Inpatient Operations module provides ward census, bed board visualization,
ADT (Admit/Discharge/Transfer) workflow, and patient movement timeline. All
read operations pull live data from VistA via existing OR package RPCs. Write
operations (admit/transfer/discharge) are integration-pending, awaiting DG ADT
package RPC availability.

## Quick Start

### Prerequisites

- VistA Docker running on port 9430 (`services/vista/docker-compose.yml`)
- API server running (`cd apps/api && npx tsx --env-file=.env.local src/index.ts`)
- Web app running (`cd apps/web && npm run dev`)
- Authenticated session (login via `/cprs/login`)

### Accessing the Module

1. Navigate to `/cprs/inpatient` directly, or
2. From CPRS menu bar: **Tools > Inpatient Operations**

## Tabs

### 1. Ward Census

- **Data source:** `ORQPT WARDS` + `ORQPT WARD PATIENTS` + `ORWPT16 ADMITLST`
- Click a ward button to load its patient census
- Click a patient row to see detail drawer with "Open Chart" navigation
- Census enrichment (admit date, room/bed) comes from ORWPT16

### 2. Bed Board

- **Data source:** `ORQPT WARD PATIENTS` + `ORWPT16 ADMITLST`
- Select a ward from the dropdown to see the bed grid
- Occupied beds show patient initials; click for detail modal
- **Known limitation:** Only occupied beds are shown. Empty/OOS bed data requires
  `ZVEBED LIST` custom RPC (see grounding doc)

### 3. ADT Workflow

- Three action buttons: Admit / Transfer / Discharge
- Each opens a modal showing:
  - Integration status (currently: integration-pending)
  - Target VistA RPC and FileMan files
  - Required fields for the operation
  - Migration path (Phase 83B)
- **No dead clicks:** every button shows actionable integration information

### 4. Movement Timeline

- Enter a patient DFN and press Enter or click "Load Movements"
- Shows chronological timeline of admission events
- **Known limitation:** Only admission events from ORWPT16. Transfer/discharge
  movements require `ZVEADTM LIST` custom RPC (see grounding doc)

## API Endpoints

| Method | Path                                       | RPC(s)                                | Status         |
| ------ | ------------------------------------------ | ------------------------------------- | -------------- |
| GET    | `/vista/inpatient/wards`                   | ORQPT WARDS, ORQPT WARD PATIENTS      | Live           |
| GET    | `/vista/inpatient/ward-census?ward=IEN`    | ORQPT WARD PATIENTS, ORWPT16 ADMITLST | Live           |
| GET    | `/vista/inpatient/bedboard?ward=IEN`       | ORQPT WARD PATIENTS, ORWPT16 ADMITLST | Live (partial) |
| GET    | `/vista/inpatient/patient-movements?dfn=N` | ORWPT16 ADMITLST                      | Live (partial) |
| POST   | `/vista/inpatient/admit`                   | DGPM NEW ADMISSION                    | Pending        |
| POST   | `/vista/inpatient/transfer`                | DGPM NEW TRANSFER                     | Pending        |
| POST   | `/vista/inpatient/discharge`               | DGPM NEW DISCHARGE                    | Pending        |

## Troubleshooting

### "No wards found"

- VistA Docker may not be running: `docker ps | Select-String worldvista`
- API may not be connected: check `GET /vista/ping`
- Session may have expired: re-login at `/cprs/login`

### "No patients on this ward"

- Normal in sandbox — WorldVistA Docker may have zero active admissions
- Try different wards; patient distribution varies by sandbox configuration

### Bedboard shows no empty beds

- Expected: ORQPT RPCs only return occupied beds
- Future: `ZVEBED LIST` RPC will enumerate all beds including empty/OOS

### Movement timeline shows only admissions

- Expected: ORWPT16 ADMITLST returns admission episodes only
- Future: `ZVEADTM LIST` RPC will return full movement chain from ^DGPM(405)

### ADT actions show "integration-pending"

- Expected: DG ADT write RPCs not in OR CPRS GUI CHART context
- Future Phase 83B: wire DGPM write RPCs or implement ZVE\* wrappers

## Architecture

```
Web (Next.js)                    API (Fastify)                VistA
/cprs/inpatient/                 /vista/inpatient/*
  ├── CensusTab      ──fetch──>  /wards              ──RPC──> ORQPT WARDS
  │                              /ward-census?ward=   ──RPC──> ORQPT WARD PATIENTS
  │                                                   ──RPC──> ORWPT16 ADMITLST
  ├── BedboardTab    ──fetch──>  /bedboard?ward=      ──RPC──> ORQPT WARD PATIENTS
  │                                                   ──RPC──> ORWPT16 ADMITLST
  ├── ADTWorkflowTab ──POST───>  /admit|transfer|     ──202──> integration-pending
  │                              discharge
  └── MovementTab    ──fetch──>  /patient-movements   ──RPC──> ORWPT16 ADMITLST
```

## Related Files

- API routes: `apps/api/src/routes/inpatient/index.ts`
- Web page: `apps/web/src/app/cprs/inpatient/page.tsx`
- Phase 67 ADT routes: `apps/api/src/routes/adt/index.ts`
- Grounding: `docs/runbooks/inpatient-adt-grounding.md`
- CPRSMenuBar nav entry: `apps/web/src/components/cprs/CPRSMenuBar.tsx`
