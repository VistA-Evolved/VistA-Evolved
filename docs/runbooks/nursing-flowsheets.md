# Nursing Documentation + Flowsheets — Runbook

## Overview
Phase 84 adds enterprise-grade nursing documentation with flowsheets, critical
value highlighting, I&O tracking shells, nursing assessments, and note
creation — all grounded to VistA's TIU, GMV, GMR, and GN packages.

## Quick Start

1. Start VistA Docker: `cd services/vista; docker compose --profile dev up -d`
2. Start API: `cd apps/api; npx tsx --env-file=.env.local src/index.ts`
3. Start Web: `cd apps/web; npx next dev`
4. Navigate: Tools → Nursing Documentation (or go to `/cprs/nursing`)
5. Enter a patient DFN (e.g., `3`) to load the nursing workspace

## Page Layout

### Patient Context Banner
Shows patient name, DFN, location, room/bed, and attending provider.
- Source: `ORWPT16 ID INFO` (fallback: `ORWPT ID INFO`)
- Banner updates when patient DFN changes

### Tab 1: Nursing Notes
- Lists existing notes via `TIU DOCUMENTS BY CONTEXT` (class 3 = Nursing)
- View full note text via `TIU GET RECORD TEXT`
- Create new notes via `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT`
- If TIU Nursing Note class not configured, falls back to local draft with migration target documented
- Note types: Nursing Note, Shift Assessment, Progress Note, Patient Education, Discharge Planning

### Tab 2: Flowsheets
Three sub-tabs:

**Vitals Trends**
- Source: `ORQQVI VITALS` via `/vista/nursing/flowsheet`
- Groups vitals by type (BP, Pulse, Temp, Resp, SpO2, etc.)
- Shows trend cards with latest value, reading count, and date range
- Critical values highlighted with red border and CRITICAL badge
- Configurable thresholds: BP ≥180, HR <50/>130, Temp <95/>103°F, SpO2 ≤90%, Pain ≥8
- Due/overdue indicator (4-hour inpatient schedule)

**I&O (Intake & Output)**
- Status: integration-pending
- Target: GMR(126) INTAKE/OUTPUT file
- Target RPCs: GMRIO RESULTS, GMRIO ADD
- Shows I&O shell with intake/output/net balance cards (all zeros until wired)

**Assessments**
- Status: integration-pending  
- Target: GN(228) ASSESSMENT file or TIU-based templates
- Target RPCs: ZVENAS LIST, ZVENAS SAVE (custom, to be built)
- Shows assessment type cards: Head-to-Toe, Pain, Fall Risk (Morse), Braden Skin, Restraint

### Tab 3: Tasks & Reminders
- Derives task list from vitals due/overdue status
- Safety checks: Fall Risk Assessment, Skin Integrity, Pain Assessment, I&O Recording
- Critical value alerts with "notify provider" indicator
- Full BCMA-derived task engine pending PSB package integration

## API Endpoints

### Phase 84 New Endpoints

| Method | Path | Source | RPC |
|--------|------|--------|-----|
| GET | `/vista/nursing/flowsheet?dfn=N` | VistA live | ORQQVI VITALS |
| GET | `/vista/nursing/io?dfn=N` | integration-pending | GMRIO RESULTS |
| GET | `/vista/nursing/assessments?dfn=N` | integration-pending | ZVENAS LIST |
| POST | `/vista/nursing/notes/create` | VistA or local-draft | TIU CREATE RECORD + TIU SET DOCUMENT TEXT |
| GET | `/vista/nursing/note-text?ien=N` | VistA | TIU GET RECORD TEXT |
| GET | `/vista/nursing/critical-thresholds` | config | (in-memory) |
| GET | `/vista/nursing/patient-context?dfn=N` | VistA | ORWPT16 ID INFO |

### Phase 68 Existing Endpoints (unchanged)

| Method | Path | Source | RPC |
|--------|------|--------|-----|
| GET | `/vista/nursing/vitals?dfn=N` | VistA live | ORQQVI VITALS |
| GET | `/vista/nursing/vitals-range?dfn=N&start=D&end=D` | VistA | ORQQVI VITALS FOR DATE RANGE |
| GET | `/vista/nursing/notes?dfn=N` | VistA | TIU DOCUMENTS BY CONTEXT |
| GET | `/vista/nursing/ward-patients?ward=IEN` | VistA | ORQPT WARD PATIENTS |
| GET | `/vista/nursing/tasks?dfn=N` | integration-pending | PSB MED LOG |
| GET | `/vista/nursing/mar?dfn=N` | integration-pending | PSB ALLERGY |
| POST | `/vista/nursing/mar/administer` | integration-pending | PSB MED LOG |

## Troubleshooting

### Notes tab shows "No nursing notes"
- TIU document class 3 (Nursing Documents) may not have entries in the sandbox
- Verify: `curl http://localhost:3001/vista/nursing/notes?dfn=3`
- Check `rpcUsed` in response to confirm RPC was called

### Note creation returns "local draft"
- TIU Nursing Note title (IEN 3) may not exist in sandbox TIU DOCUMENT DEFINITION
- The note is saved as a local draft with a `draftId`
- Migration path: configure TIU Document Definition for Nursing Notes class

### Flowsheet shows no data
- Patient may have no recorded vitals in sandbox
- Verify: `curl http://localhost:3001/vista/nursing/flowsheet?dfn=3`
- Try adding a vital first: `POST /vista/vitals` with `{"dfn":"3","type":"BP","value":"120/80"}`

### I&O shows "Integration Pending"
- Expected — GMR I&O RPCs not exposed in OR CPRS GUI CHART context
- Target: GMRIO RESULTS, GMRIO ADD from GMR package

## Safety Features (Competitive Baseline)

| Feature | Epic Equivalent | Status |
|---------|-----------------|--------|
| Critical value highlighting | Best Practice Alerts (BPA) | ✅ Implemented |
| Configurable thresholds | Threshold-based alerts | ✅ Configurable |
| Due/overdue vitals indicators | Task timers | ✅ Implemented |
| Shift safety checklist | Safety Rounding | ✅ Static reminders |
| Note audit trail | Note tracking | ✅ Via TIU (signed/unsigned status) |
| I&O tracking | Flowsheet I&O | 🔄 Shell (integration-pending) |
| Nursing assessments | Doc Flowsheets | 🔄 Shell (integration-pending) |
| MAR integration | eMAR | 🔄 Pending (BCMA/PSB) |
