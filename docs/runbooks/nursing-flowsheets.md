# Nursing Documentation + Flowsheets — Runbook

## Overview

Phase 84 adds enterprise-grade nursing documentation with flowsheets, critical
value highlighting, I&O tracking shells, nursing assessments, and note
creation — all grounded to VistA's TIU, GMV, GMR, and GN packages.

Phase 707 extends the standalone nursing note flow so it now uses the proven
TIU create contract, refreshes signed and unsigned TIU notes together, and
attempts immediate signing when the user supplies an electronic signature code.

## Quick Start

1. Start VistA Docker: `cd services/vista; docker compose --profile dev up -d`
2. Start API: `cd apps/api; npx tsx --env-file=.env.local src/index.ts`
3. Start Web: `cd apps/web; npx next dev`
4. Navigate: Tools → Nursing Documentation (or go to `/cprs/nursing`)
5. Enter a patient DFN (use `46` in VEHU) to load the nursing workspace

## Page Layout

### Patient Context Banner

Shows patient name, DFN, location, room/bed, and attending provider.

- Source: `ORWPT16 ID INFO` (fallback: `ORWPT ID INFO`)
- Banner updates when patient DFN changes
- VEHU currently returns the patient name in the final `ORWPT16 ID INFO` field, so the banner parser must not treat the first piece as the patient name

### Tab 1: Nursing Notes

- Lists existing signed and unsigned notes via merged `TIU DOCUMENTS BY CONTEXT` calls (class 3 = Nursing)
- View full note text via `TIU GET RECORD TEXT`
- Create new notes via `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT`
- Optionally attempts `TIU LOCK RECORD` + `TIU SIGN RECORD` + `TIU UNLOCK RECORD` when an electronic signature code is entered
- If the electronic signature code is missing or invalid, the note is still created and remains unsigned with a blocker message
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

- The primary task table reflects live `/vista/nursing/tasks` results for the current patient
- Current live fallback derives medication-related nursing tasks from `ORWPS ACTIVE`
- Shift safety reminders remain available, but are explicitly labeled local checklist guidance rather than live patient task rows
- Critical value alerts with "notify provider" indicator remain grounded to the live flowsheet/vitals feed
- Full BCMA-derived task timing and administration workflow remain pending PSB package integration

## API Endpoints

### Phase 84 New Endpoints

| Method | Path                                   | Source               | RPC                                       |
| ------ | -------------------------------------- | -------------------- | ----------------------------------------- |
| GET    | `/vista/nursing/flowsheet?dfn=N`       | VistA live           | ORQQVI VITALS                             |
| GET    | `/vista/nursing/io?dfn=N`              | integration-pending  | GMRIO RESULTS                             |
| GET    | `/vista/nursing/assessments?dfn=N`     | integration-pending  | ZVENAS LIST                               |
| POST   | `/vista/nursing/notes/create`          | VistA or local-draft | TIU CREATE RECORD + TIU SET DOCUMENT TEXT (+ optional TIU sign sequence) |
| GET    | `/vista/nursing/note-text?ien=N`       | VistA                | TIU GET RECORD TEXT                       |
| GET    | `/vista/nursing/critical-thresholds`   | config               | (in-memory)                               |
| GET    | `/vista/nursing/patient-context?dfn=N` | VistA                | ORWPT16 ID INFO                           |

### Phase 68 Existing Endpoints (unchanged)

| Method | Path                                              | Source              | RPC                          |
| ------ | ------------------------------------------------- | ------------------- | ---------------------------- |
| GET    | `/vista/nursing/vitals?dfn=N`                     | VistA live          | ORQQVI VITALS                |
| GET    | `/vista/nursing/vitals-range?dfn=N&start=D&end=D` | VistA               | ORQQVI VITALS FOR DATE RANGE |
| GET    | `/vista/nursing/notes?dfn=N`                      | VistA               | TIU DOCUMENTS BY CONTEXT     |
| GET    | `/vista/nursing/ward-patients?ward=IEN`           | VistA               | ORQPT WARD PATIENTS          |
| GET    | `/vista/nursing/tasks?dfn=N`                      | VistA live fallback | ORWPS ACTIVE                 |
| GET    | `/vista/nursing/mar?dfn=N`                        | integration-pending | PSB ALLERGY, PSB MED LOG     |
| POST   | `/vista/nursing/mar/administer`                   | integration-pending | PSB MED LOG                  |

## Troubleshooting

### Notes tab shows "No nursing notes"

- TIU document class 3 (Nursing Documents) may not have entries in the sandbox
- Verify: `curl http://localhost:3001/vista/nursing/notes?dfn=3`
- Check `rpcUsed` in response to confirm RPC was called

### Note creation returns "local draft"

- TIU Nursing Note creation hit a real TIU blocker in the current environment
- The note is saved as a local draft with a `draftId`
- Migration path: configure TIU Document Definition for Nursing Notes class

### Note is created but remains unsigned

- This is expected when no electronic signature code is entered
- This is also expected when the entered electronic signature code is invalid for the current VistA user
- Verify via `POST /vista/nursing/notes/create` with and without `esCode`
- The route returns `status: created`, `noteStatus: UNSIGNED`, and a `signStatus` / `signMessage` that explains what happened

### Flowsheet shows no data

- Patient may have no recorded vitals in sandbox
- Verify: `curl http://localhost:3001/vista/nursing/flowsheet?dfn=3`
- Vitals can be recorded via `GMV ADD VM` RPC (called by VistA CPRS client)

### I&O shows "Integration Pending"

- Expected — GMR I&O RPCs not exposed in OR CPRS GUI CHART context
- Target: GMRIO RESULTS, GMRIO ADD from GMR package

### Tasks tab shows no live nursing tasks

- Confirm the patient has active medication-derived work on the VEHU lane before expecting rows in `/vista/nursing/tasks`
- Verify: `curl http://localhost:3001/vista/nursing/tasks?dfn=46`
- An empty truthful response should remain distinct from the local shift safety checklist shown underneath it

## Nursing Tasks Truth Contract

- The standalone `/cprs/nursing` Tasks tab must not present local checklist reminders as if they were live patient-specific nursing task rows.
- The primary task table must reflect the live `/vista/nursing/tasks` response for the selected patient.
- If the live task route returns no rows, the page must say so plainly instead of fabricating task rows from local heuristics.
- If the live task route fails while flowsheet data still loads, the task section must surface the task-load failure rather than silently falling back to an empty-task message.
- Local shift safety reminders may remain on the page only when they are clearly labeled as guidance and separated from the live VistA task feed.

## Nursing Notes Truth Contract

- The standalone `/cprs/nursing` Nursing Notes table must reflect the live TIU note feed for the selected patient, including newly created unsigned notes.
- A successful nursing note creation must not disappear from the refreshed list simply because the note has not been signed yet.
- The create modal must distinguish among local draft, created unsigned, and sign-blocked outcomes using the actual API response.
- Invalid electronic signature codes must surface a clean blocker message instead of fake success or raw VistA error text.

## Safety Features (Competitive Baseline)

| Feature                       | Epic Equivalent            | Status                              |
| ----------------------------- | -------------------------- | ----------------------------------- |
| Critical value highlighting   | Best Practice Alerts (BPA) | ✅ Implemented                      |
| Configurable thresholds       | Threshold-based alerts     | ✅ Configurable                     |
| Due/overdue vitals indicators | Task timers                | ✅ Implemented                      |
| Shift safety checklist        | Safety Rounding            | ✅ Static reminders                 |
| Note audit trail              | Note tracking              | ✅ Via TIU (signed/unsigned status) |
| I&O tracking                  | Flowsheet I&O              | 🔄 Shell (integration-pending)      |
| Nursing assessments           | Doc Flowsheets             | 🔄 Shell (integration-pending)      |
| MAR integration               | eMAR                       | 🔄 Pending (BCMA/PSB)               |
