# Phase 539 — Scheduling Parity vs VSE (IMPLEMENT)

Wave 39 P9. Close the scheduling gap between VA's VS GUI / VSE and
VistA-Evolved's web scheduling module.

## Context

35 scheduling endpoints exist (Phases 63/123/131/139/147/170). 25+ SDES/SDOE/SD
RPCs registered. 27 capabilities. 6 tabs on scheduling page. Portal appointments
page. Writeback guard + truth gate.

**Gap report shows 3 VSE surfaces with low coverage:**
- `vse-wait-list` — 0% (p1-high). API exists, no dedicated UI.
- `vse-recall-reminder` — 0% (p2-medium). No API, no RPCs.
- `vse-resource-view` — 33% (p2-medium). API partial, no dedicated UI panel.

## Deliverables

### 1. Recall/Reminder API routes (read-only, integration-pending)
- `GET /scheduling/recall?dfn=N` — recall list for patient
- `GET /scheduling/recall/:ien` — recall detail
- `GET /scheduling/parity` — VSE vs VistA-Evolved parity matrix (live)

### 2. Register recall RPCs
- SD RECALL LIST (read) — File 403.5
- SD RECALL GET (read) — recall detail
- SDES GET RECALL ENTRIES (read) — SDES recall
- SD RECALL DATE CHECK (read) — recall compliance check

### 3. Add capabilities
- scheduling.recall.list (pending)
- scheduling.recall.detail (pending)
- scheduling.parity (live)

### 4. Extend scheduling page UI
- Add "Wait List" tab — fetches `/scheduling/waitlist`, displays entries
- Add "Recall" tab — fetches `/scheduling/recall`, integration-pending display
- Add "Parity" tab — fetches `/scheduling/parity`, visual VSE parity matrix

### 5. Update gap report
- vse-wait-list: scaffold → 50%
- vse-recall-reminder: not-started → scaffold 33%
- vse-resource-view: scaffold → 50%

### 6. Store policy
- scheduling-recall-store (clinical_data, in_memory_only)
- scheduling-parity-cache (cache, in_memory_only)

## Files touched
- apps/api/src/routes/scheduling/index.ts (3 new endpoints)
- apps/api/src/vista/rpcRegistry.ts (4 recall RPCs)
- config/capabilities.json (3 entries)
- apps/web/src/app/cprs/scheduling/page.tsx (3 tabs)
- apps/api/src/platform/store-policy.ts (2 entries)
- data/ui-estate/ui-gap-report.json (3 surface updates)
