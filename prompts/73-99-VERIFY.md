# Phase 67 (Prompt 73) — VERIFY: ADT + Inpatient Lists v1

## Gates

| Gate | Description | Result |
|------|-------------|--------|
| G67-PLAN | adt-plan.json audit — subTabs array matches code (5 sub-tabs) | PASS (fixed: added "Admissions") |
| G67-REALITY | No mock/hardcoded ward names, patient names, or stub data | PASS |
| G67-TRACE | All 12 actions trace to capabilities, RPCs, and endpoints | PASS |
| G67-E2E | Ward census + movement flow, all 9 read routes + 3 write-pending | PASS |
| G67-NEGATIVE | Invalid inputs handled by pendingFallback + try/catch | PASS |
| G67-REGRESSION | verify-phase67-adt.ps1 69/69, Phase 54 audit 8/8, verify-latest 69/69 | PASS |

## Issues Found & Fixed

### Phase 67 Issues
1. **adt-plan.json subTabs missing "Admissions"** — Plan listed 4 sub-tabs but code has 5. Fixed: added "Admissions" to subTabs array.
2. **Modern layout sidebar missing newer tabs** — Hardcoded sidebar nav in page.tsx only had 11 classical tabs. Fixed: added immunizations, adt, intake, telehealth, tasks, aiassist with proper display labels (ADT, AI Assist, etc.).

### Pre-existing TSC Errors (4 resolved)
3. **AddAllergyDialog.tsx** — Used `name` but Allergy type has `allergen`. Fixed: `name →  allergen`.
4. **AddVitalDialog.tsx** — Used `date` + `units` but Vital type has `takenAt` only. Fixed: `date → takenAt`, removed `units`.
5. **CreateNoteDialog.tsx** — Used `text` but Note type requires `location` + `status`. Fixed: replaced `text` with `location: ''`, `status: 'Draft'`.
6. **AcknowledgeLabDialog.tsx** — `modalData?.labIds` typed as `unknown`, not narrowable to `string[]`. Fixed: extract to intermediate variable for `Array.isArray` narrowing.

## Verification Results

- **API TSC**: 0 errors
- **Web TSC**: 0 errors
- **Phase 67 verify**: 69/69 PASS
- **Phase 54 audit**: 8/8 PASS
- **verify-latest**: 69/69 PASS

## Files Touched

- `artifacts/phase67/adt-plan.json` — Added "Admissions" to subTabs
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — Modern sidebar: added 6 missing tabs
- `apps/web/src/components/cprs/dialogs/AddAllergyDialog.tsx` — name → allergen
- `apps/web/src/components/cprs/dialogs/AddVitalDialog.tsx` — date → takenAt, removed units
- `apps/web/src/components/cprs/dialogs/CreateNoteDialog.tsx` — text → location+status
- `apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx` — Array.isArray narrowing
