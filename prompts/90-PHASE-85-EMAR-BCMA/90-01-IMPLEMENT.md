# Phase 85 -- eMAR + BCMA Posture (IMPLEMENT)

## User Request

Build an enterprise eMAR (electronic Medication Administration Record) module
with VistA-first medication schedule, BCMA safety posture, allergy warnings,
duplicate therapy heuristic, and RBAC audit.

## Implementation Steps

1. **Inventory** -- Audit existing med/pharmacy/BCMA code paths (done)
2. **API routes** (`apps/api/src/routes/emar/index.ts`):
   - `GET /emar/schedule?dfn=N` -- Active med schedule from ORWPS ACTIVE (real VistA)
   - `GET /emar/allergies?dfn=N` -- Allergy warnings via ORQQAL LIST (real VistA)
   - `GET /emar/history?dfn=N` -- Admin history (integration-pending -> PSB MED LOG)
   - `POST /emar/administer` -- Record admin (integration-pending -> PSB MED LOG)
   - `GET /emar/duplicate-check?dfn=N` -- Heuristic duplicate therapy (labeled)
   - `POST /emar/barcode-scan` -- BCMA scan (integration-pending -> PSJBCMA)
3. **Register routes** in `apps/api/src/index.ts`
4. **Web page** (`apps/web/src/app/cprs/emar/page.tsx`):
   - Med schedule grid with due times, PRN/scheduled, admin markers
   - Allergy warning banner (real data from ORQQAL LIST)
   - Duplicate therapy banner (labeled as heuristic)
   - Administration recording UI (posture-only)
   - RBAC: nurse/admin for write actions
5. **Navigation** -- Add eMAR to CPRSMenuBar Tools menu
6. **Docs** -- Runbook + grounding doc
7. **Verifier** -- `scripts/verify-phase85-emar-bcma.ps1`

## Verification Steps

- tsc clean for both apps/api and apps/web
- All 6 eMAR endpoints respond with correct shape
- Real VistA data for schedule + allergies
- Integration-pending endpoints include vistaGrounding
- No dead clicks on UI
- Heuristic labeled as heuristic
- verify-latest passes
- Phase verifier passes all gates

## Files Touched

- `apps/api/src/routes/emar/index.ts` (new)
- `apps/api/src/index.ts` (register route)
- `apps/web/src/app/cprs/emar/page.tsx` (new)
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` (nav entry)
- `docs/runbooks/emar-bcma.md` (new)
- `docs/grounding/emar-bcma-grounding.md` (new)
- `scripts/verify-phase85-emar-bcma.ps1` (new)
- `prompts/90-PHASE-85-EMAR-BCMA/90-01-IMPLEMENT.md` (this file)
- `prompts/90-PHASE-85-EMAR-BCMA/90-99-VERIFY.md` (new)
