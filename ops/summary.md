# Phase 12 — CPRS Parity Wiring — Ops Summary

## What Changed

### Phase 12 New API Endpoints (9)
- `GET /vista/icd-search?q=` — ORQQPL4 LEX lexicon search
- `GET /vista/consults?dfn=` — ORQQCN LIST
- `GET /vista/consults/detail?id=` — ORQQCN DETAIL
- `GET /vista/surgery?dfn=` — ORWSR LIST
- `GET /vista/dc-summaries?dfn=` — TIU DOCUMENTS BY CONTEXT (class 244)
- `GET /vista/tiu-text?id=` — TIU GET RECORD TEXT
- `GET /vista/labs?dfn=` — ORWLRR INTERIM
- `GET /vista/reports` — ORWRP REPORT LISTS
- `GET /vista/reports/text?dfn=&id=&hsType=` — ORWRP REPORT TEXT

### 5 Gap Panels Wired to Live Data
- ConsultsPanel — useDataCache + detail text fetch
- SurgeryPanel — useDataCache + split pane layout
- DCSummPanel — useDataCache + full text fetch
- LabsPanel — useDataCache + acknowledge workflow
- ReportsPanel — useDataCache + report text fetch
- All show "Data source: live RPC" (no more mock data)

### 3 Dialogs Improved
- AddProblemDialog — live ICD search (ORQQPL4 LEX), API-first save, sync status
- EditProblemDialog — API-first save, sync-status banner
- AddMedicationDialog — env-based API_BASE

### Tools Menu Features
- GraphingModal — real SVG vitals chart with type selector
- LegacyConsoleModal — working RPC console with execute/clear
- RemoteDataModal — architecture docs with FHIR bridge notes

### Data Cache Extended
- 5 new types: Consult, Surgery, DCSummary, LabResult, ReportDef
- 5 new fetchers: fetchConsults, fetchSurgery, fetchDCSummaries, fetchLabs, fetchReports
- 11 total domains (up from 6)

### Documentation
- `docs/parity-coverage-report.md` — comprehensive parity report
- `docs/runbooks/vista-rpc-phase12-parity.md` — Phase 12 runbook
- `prompts/14-PHASE-12-CPRS-PARITY-WIRING/` — IMPLEMENT + VERIFY prompts

### Verification
- `scripts/verify-phase1-to-phase12-parity.ps1` — extends Phase 11 with 25+ new checks
- `/cprs/verify` page updated with 6 new Phase 12 endpoint checks

## How to Test Manually

1. Start Docker VistA: `cd services/vista && docker compose --profile dev up -d`
2. Start API: `pnpm -C apps/api dev`
3. Build web: `pnpm -C apps/web build`
4. Start web: `pnpm -C apps/web dev`
5. Navigate to `http://localhost:3000/cprs/login`
6. Search patients → select patient → chart opens
7. Click through all 10 tabs — 5 gap panels now show "live RPC"
8. Problems tab → Add Problem → type "diabetes" in ICD search box
9. Tools menu → Graphing → see SVG vitals chart
10. Tools menu → Legacy Console → execute API calls
11. Tools menu → Remote Data Viewer → see architecture info
12. Visit `http://localhost:3000/cprs/verify` — all checks green

## Verifier Output

```
Script: scripts/verify-phase1-to-phase12-parity.ps1
(Run after commit for final counts)
```

## Follow-Ups
- Real order signing workflow
- Full write-back for consults/surgery/labs (read-only in Phase 12)
- Keyboard navigation and accessibility
- See `docs/parity-coverage-report.md` for remaining gaps

Performed 2026-02-16. Results:

### Contract Validation
- 5/5 contract JSON files parse: tabs, menus, screen_registry, rpc_catalog, forms
- 10 main tabs, 12 main menus, 975 RPCs, all loaded and validated by loader.ts

### Component Audit
- **All 10 tabs**: covered with dedicated panels, switch case + fallback
- **All 9 modals**: every openModal() call has matching handler in CPRSModals
- **All 5 menus**: File(5), Edit(3), View(14), Tools(3), Help(2) — all items have handlers
- **All API fetches**: aligned with correct endpoint URLs and query params

### Bugs Fixed During Verify
1. Edit -> Paste was a dead click (readText() result discarded) — now pastes into active input
2. EditProblemDialog save was a no-op — now persists to local data-cache
3. remoteData action had no handler — now shows integration-pending alert
4. NotesPanel had unused openModal import — removed

### Known Gaps
See `ops/known-gaps.md` — 5 panels on mock data, 3 dialogs local-only, 3 menu items placeholder.
- Keyboard navigation and accessibility
