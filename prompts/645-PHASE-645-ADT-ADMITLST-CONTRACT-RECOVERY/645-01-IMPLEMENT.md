# Phase 645 - ADT ADMITLST Contract Recovery

## User Request
- Continue the live CPRS audit until the clinician-facing UI is truthful, production-grade, and VistA-first.
- Fix any broken or misleading workflow instead of masking it.

## Problem
- The ADT panel selected-ward census and admission/movement views were showing blank admit metadata even for real inpatients.
- Live probing showed `ORQPT WARD PATIENTS` returned active inpatients, while `ORWPT16 ADMITLST` rows were being discarded by an outdated parser.
- The implemented parser assumed `DFN^NAME^ADMIT_DATE^WARD^ROOM`, but live VEHU returned rows like `3090104.111157^158^JAN 04, 2009@11:11:57^DIRECT^TO: 7A GEN MED`.

## Implementation Steps
1. Inventory the live ADT route wiring and confirm the defect with browser plus curl verification.
2. Update the ADT route parser to match the real `ORWPT16 ADMITLST` contract from VEHU.
3. Enrich ward census detail truthfully by taking room/bed from `ORQPT WARD PATIENTS` and admission date/location from `ORWPT16 ADMITLST`.
4. Update movement and admission-list responses so they expose live admission events instead of empty arrays.
5. Update any related frontend formatting or documentation only where needed to reflect the corrected contract.
6. Re-verify the live ADT routes and clinician UI against the running VEHU Docker.

## Files Touched
- apps/api/src/routes/adt/index.ts
- apps/api/src/routes/inpatient/index.ts
- apps/web/src/components/cprs/panels/ADTPanel.tsx
- docs/runbooks/inpatient-adt.md
