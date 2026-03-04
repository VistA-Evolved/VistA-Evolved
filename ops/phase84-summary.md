# Phase 84 — Nursing Documentation + Flowsheets — Summary

## What Changed

- **7 new API endpoints** added to `apps/api/src/routes/nursing/index.ts`:
  - `GET /vista/nursing/critical-thresholds` — configurable safety thresholds
  - `GET /vista/nursing/patient-context` — ORWPT16 ID INFO with ORWPT fallback
  - `GET /vista/nursing/flowsheet` — vitals with trends, critical flags, due/overdue
  - `GET /vista/nursing/io` — I&O shell (integration-pending, GMR(126) target)
  - `GET /vista/nursing/assessments` — assessments shell (integration-pending, GN(228) target)
  - `POST /vista/nursing/notes/create` — TIU CREATE RECORD + TIU SET DOCUMENT TEXT
  - `GET /vista/nursing/note-text` — TIU GET RECORD TEXT
- **Standalone nursing page** at `/cprs/nursing` with:
  - Patient context banner (name, location, room/bed, attending)
  - 3 tabs: Notes, Flowsheets, Tasks
  - Critical value highlighting (red badges/borders)
  - Due/overdue indicators (4-hour rule)
  - I&O and assessments integration-pending shells
  - Note creation modal with SOAPIE template
- **Navigation entry** in CPRSMenuBar Tools menu
- **Phase 68 endpoints preserved intact** (vitals, vitals-range, notes, ward-patients, tasks, mar, mar/administer)

## Safety Features

- Configurable critical thresholds: BP>=180, HR <50/>130, Temp <95/>103°F, Resp <8/>30, SpO2 <=90%, Pain >=8
- Visual critical value highlighting with red borders and count badges
- Due/overdue indicators based on 4-hour inpatient vitals schedule
- Shift-based safety reminders: fall risk, skin integrity, pain, I&O

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start web: `cd apps/web && npx next dev`
3. Navigate to `/cprs/nursing`, enter patient DFN (e.g., 3)
4. Verify patient context banner loads
5. Check Notes tab: list, view text, create note
6. Check Flowsheets tab: vitals trend, I&O (pending), assessments (pending)
7. Check Tasks tab: overdue indicators, safety checklist

## Verifier Output

- `scripts/verify-phase84-nursing.ps1`: **79/79 PASS**
- `scripts/verify-latest.ps1`: **75/75 PASS**

## Follow-ups

- Phase 84B: Build custom ZVENAS RPCs for assessments
- Wire GMRIO RPCs for I&O when available in sandbox
- TIU SIGN RECORD integration for note signing
- PSB MED LOG integration for BCMA-derived task list
