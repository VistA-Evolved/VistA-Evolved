# Phase 12: CPRS Parity Wiring — VERIFY

> Prompt ref: `prompts/14-PHASE-12-CPRS-PARITY-WIRING/14-99-cprs-parity-wiring-VERIFY.md`

## Verification Checklist

### API Endpoints (9 new)
- [ ] `GET /vista/icd-search?q=hyper` → returns ok:true with lexicon results
- [ ] `GET /vista/consults?dfn=1` → returns ok:true (even if count=0)
- [ ] `GET /vista/consults/detail?id=1` → returns ok:true
- [ ] `GET /vista/surgery?dfn=1` → returns ok:true
- [ ] `GET /vista/dc-summaries?dfn=1` → returns ok:true
- [ ] `GET /vista/tiu-text?id=1` → returns ok:true with text
- [ ] `GET /vista/labs?dfn=1` → returns ok:true
- [ ] `GET /vista/reports` → returns ok:true with 23+ report types
- [ ] `GET /vista/reports/text?dfn=1&id=1` → returns ok:true

### Panel Wiring (5 panels)
- [ ] ConsultsPanel shows "Data source: live RPC" subtitle
- [ ] SurgeryPanel shows "Data source: live RPC" subtitle
- [ ] DCSummPanel shows "Data source: live RPC" subtitle
- [ ] LabsPanel shows "Data source: live RPC" subtitle
- [ ] ReportsPanel shows "Data source: live RPC" subtitle
- [ ] No MOCK_* constants in any panel file

### Dialog Improvements (3 dialogs)
- [ ] EditProblemDialog tries API → shows sync status banner
- [ ] AddProblemDialog has ICD search box → returns lexicon results
- [ ] AddMedicationDialog uses env-based API_BASE

### Tools Menu Features (3 modals)
- [ ] Tools → Graphing shows SVG vitals chart
- [ ] Tools → Remote Data Viewer opens modal (not disabled)
- [ ] Tools → Legacy Console allows executing API endpoints

### Data Cache (5 new domains)
- [ ] consults domain exists in ClinicalData interface
- [ ] surgery domain exists in ClinicalData interface
- [ ] dcSummaries domain exists in ClinicalData interface
- [ ] labs domain exists in ClinicalData interface
- [ ] reports domain exists in ClinicalData interface

### Build & Documentation
- [ ] `pnpm -C apps/web build` succeeds
- [ ] `docs/parity-coverage-report.md` exists with 24 API endpoints listed
- [ ] No TypeScript errors in changed files

## Quick Test Commands

```bash
# API endpoints
curl http://127.0.0.1:3001/vista/icd-search?q=hyper
curl http://127.0.0.1:3001/vista/consults?dfn=1
curl http://127.0.0.1:3001/vista/surgery?dfn=1
curl http://127.0.0.1:3001/vista/dc-summaries?dfn=1
curl http://127.0.0.1:3001/vista/labs?dfn=1
curl http://127.0.0.1:3001/vista/reports
curl "http://127.0.0.1:3001/vista/reports/text?dfn=1&id=1"

# Build check
cd apps/web && npx next build
```
