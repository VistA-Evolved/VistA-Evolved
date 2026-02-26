# Phase 138 — Nursing DOC + MAR + Handoff (VistA-first)

## What Changed

### Infrastructure Wiring
- **immutable-audit.ts**: Added 25 audit actions (23 original + 2 from VERIFY: nursing.ward-patients, nursing.note-text)
- **rpcRegistry.ts**: Added 5 RPC exceptions (PSB MED LOG, PSB ALLERGY, PSJBCMA, GMRIO RESULTS, GMRIO ADD)
- **capabilities.json**: Added 14 new capabilities (8 live, 6 pending)
- **modules.json**: Added `/emar/` and `/handoff/` route patterns to clinical module

### API Route Hardening
- **nursing/index.ts**: All 14 endpoints hardened with immutableAudit, session, pendingFallback ok:false
- **emar/index.ts**: All 6 endpoints hardened with immutableAudit, session, pendingFallback ok:false
- **handoff/index.ts**: All 8 endpoints switched from audit() to immutableAudit()

### UI Enhancement
- **NursingPanel.tsx**: CSRF headers, Flowsheet tab, Handoff tab (6 sub-tabs total)

## VERIFY Fixes Applied (6)
1. **Wrong audit action**: ward-patients endpoint used `nursing.vitals` -- fixed to `nursing.ward-patients`
2. **Fake writeback (eMAR administer)**: POST /emar/administer returned `ok:true` with integration-pending -- fixed to `ok:false`
3. **Fake writeback (eMAR barcode)**: POST /emar/barcode-scan returned `ok:true` with integration-pending -- fixed to `ok:false`
4. **Missing audit (note-text)**: GET /vista/nursing/note-text had no immutableAudit calls -- added success + error path audit
5. **FlowsheetEntry type mismatch**: UI expected {category, label} but API returns {type, critical} -- fixed interface + table columns
6. **pendingTargets shape**: Flowsheet error used string array instead of {rpc, package, reason} objects -- fixed

## Verifier Output
- TSC: clean (0 errors)
- Next.js build: compiled successfully, 52/52 pages
- Vitest: 79 passed (4 pending in RPC replay -- infrastructure)
- Gauntlet FAST: 4P/0F/1W
- Gauntlet RC: 15P/0F/1W

## Follow-ups
- Wire PSB MED LOG / PSB ALLERGY when BCMA package is available
- Wire GMRIO ADD/RESULTS when Nursing I/O package is installed
- Handoff CRHD migration when SBAR M routines are written