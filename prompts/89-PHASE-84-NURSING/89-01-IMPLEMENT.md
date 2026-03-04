# Phase 84 — IMPLEMENT: Nursing Documentation + Flowsheets

## User Request

Build enterprise-grade nursing documentation with flowsheets, critical value
highlighting, I&O tracking, nursing assessments, and note creation — all
VistA-grounded and usable in inpatient settings.

## Implementation Steps

### A) Enhanced nursing API routes (7 new endpoints)

1. `GET /vista/nursing/flowsheet?dfn=N` — Vitals flowsheet with trends + critical flags
2. `GET /vista/nursing/io?dfn=N` — I&O shell (integration-pending, target GMR(126))
3. `GET /vista/nursing/assessments?dfn=N` — Assessments shell (integration-pending, target GN(228))
4. `POST /vista/nursing/notes/create` — Create nursing note via TIU CREATE RECORD (fallback: local draft)
5. `GET /vista/nursing/note-text?ien=N` — Get full note text via TIU GET RECORD TEXT
6. `GET /vista/nursing/critical-thresholds` — Configurable critical value thresholds
7. `GET /vista/nursing/patient-context?dfn=N` — Patient context banner via ORWPT16 ID INFO

### B) Standalone nursing documentation page

- `/cprs/nursing` with patient selector, context banner, 3 tabs
- Tab 1: Nursing Notes (list, view, create with SOAPIE template)
- Tab 2: Flowsheets (vitals trends with critical highlighting, I&O shell, assessments shell)
- Tab 3: Tasks & Reminders (derived from vitals due/overdue + safety checklist)

### C) Safety features

- Critical value highlighting with configurable thresholds (BP, HR, Temp, Resp, SpO2, Pain)
- Due/overdue indicators (4-hour inpatient vitals schedule)
- Shift-based safety checks: fall risk, skin integrity, pain assessment, I&O recording

### D) Navigation

- Added "Nursing Documentation" to CPRSMenuBar Tools menu

### E) Documentation

- `docs/runbooks/nursing-flowsheets.md` — Runbook
- `docs/runbooks/nursing-grounding.md` — VistA files/RPCs/routines grounding map

## Verification Steps

1. `cd apps/api; npx tsc --noEmit` — Clean
2. `cd apps/web; npx next build` — Clean, `/cprs/nursing` route present
3. `scripts/verify-latest.ps1` — Passes
4. `scripts/verify-phase84-nursing.ps1` — All gates pass

## Files Touched

- `apps/api/src/routes/nursing/index.ts` — Added 7 Phase 84 endpoints
- `apps/web/src/app/cprs/nursing/page.tsx` — New standalone nursing page
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` — Added Nursing Documentation to Tools menu
- `docs/runbooks/nursing-flowsheets.md` — New
- `docs/runbooks/nursing-grounding.md` — New
- `prompts/89-PHASE-84-NURSING/89-01-IMPLEMENT.md` — This file
- `scripts/verify-phase84-nursing.ps1` — New verifier
