# Phase 12: CPRS Parity Wiring — IMPLEMENT

> Prompt ref: `prompts/12-PHASE-12-CPRS-PARITY-WIRING/12-01-cprs-parity-wiring-IMPLEMENT.md`

## User Request

Wire all 5 remaining gap panels (Consults, Surgery, D/C Summaries, Labs, Reports)
to real VistA RPCs via the Fastify API. Fix 3 local-only dialogs. Implement
Graphing, Remote Data Viewer, and Legacy Console. Create parity coverage report.

## Implementation Steps

### Section A — Consults
1. Add `GET /vista/consults?dfn=` endpoint → ORQQCN LIST
2. Add `GET /vista/consults/detail?id=` endpoint → ORQQCN DETAIL
3. Wire ConsultsPanel to data-cache `consults` domain
4. Add filter (all/pending/complete) and detail view

### Section B — Surgery
1. Add `GET /vista/surgery?dfn=` endpoint → ORWSR LIST
2. Wire SurgeryPanel to data-cache `surgery` domain

### Section C — Discharge Summaries
1. Add `GET /vista/dc-summaries?dfn=` endpoint → TIU DOCUMENTS BY CONTEXT (CLASS=244)
2. Add `GET /vista/tiu-text?id=` endpoint → TIU GET RECORD TEXT
3. Wire DCSummPanel with full text fetch on select

### Section D — Labs
1. Add `GET /vista/labs?dfn=` endpoint → ORWLRR INTERIM
2. Wire LabsPanel to data-cache `labs` domain
3. Handle raw text fallback for unstructured lab reports

### Section E — Reports
1. Add `GET /vista/reports` endpoint → ORWRP REPORT LISTS
2. Add `GET /vista/reports/text?dfn=&id=&hsType=` endpoint → ORWRP REPORT TEXT
3. Wire ReportsPanel with live catalog + text fetch

### Section F — Fix 3 Dialogs
1. EditProblemDialog: Try API first, honest fallback to local cache
2. AddProblemDialog: Add live ICD search via `GET /vista/icd-search?q=` (ORQQPL4 LEX)
3. AddMedicationDialog: Use env-based API_BASE constant

### Section G — Graphing + Remote Data + Console
1. GraphingModal: Real SVG vitals chart using data-cache vitals
2. RemoteDataModal: Architecture hook with facility list docs
3. LegacyConsoleModal: Working RPC console for API endpoint testing

### Section H — Parity Coverage Report
1. Create `docs/parity-coverage-report.md`
2. Tab-by-tab detail with RPCs, endpoints, gaps

### Section I — Verification
1. Update `/cprs/verify` page with Phase 12 checks
2. Create `scripts/verify-latest.ps1` extension

## Verification Steps

1. `pnpm -C apps/web build` — compiles cleanly
2. All 5 panels show "live RPC" data source label (no mock data)
3. `GET /vista/icd-search?q=hyper` returns lexicon results
4. Reports panel lists 23+ report types from live RPC
5. Graphing modal renders SVG chart with vitals data
6. Remote Data Viewer modal shows architecture docs
7. Legacy Console executes `/vista/ping` and shows response
8. No MOCK_* constants remain in any panel

## Files Touched

- `apps/api/src/index.ts` — 9 new endpoints
- `apps/web/src/stores/data-cache.tsx` — 5 new types + fetchers
- `apps/web/src/components/cprs/panels/ConsultsPanel.tsx` — rewritten
- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx` — rewritten
- `apps/web/src/components/cprs/panels/DCSummPanel.tsx` — rewritten
- `apps/web/src/components/cprs/panels/LabsPanel.tsx` — rewritten
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx` — rewritten
- `apps/web/src/components/cprs/dialogs/EditProblemDialog.tsx` — API try-first
- `apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx` — ICD search
- `apps/web/src/components/cprs/dialogs/AddMedicationDialog.tsx` — env var
- `apps/web/src/components/cprs/CPRSModals.tsx` — 3 modal upgrades + remoteData
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` — enable Remote Data Viewer
- `docs/parity-coverage-report.md` — new
- `docs/runbooks/vista-rpc-phase12-parity.md` — new
