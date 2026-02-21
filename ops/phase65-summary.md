# Phase 65 — Immunizations v1 (VistA-First) Summary

## What Changed

### API (apps/api)
- **New route plugin**: `routes/immunizations/index.ts` — 3 endpoints:
  - `GET /vista/immunizations?dfn=N` — patient history via `ORQQPX IMMUN LIST`
  - `GET /vista/immunizations/catalog` — type picker via `PXVIMM IMM SHORT LIST`
  - `POST /vista/immunizations?dfn=N` — returns 202 integration-pending (PX SAVE DATA deferred)
- **rpcRegistry**: Added `ORQQPX IMMUN LIST` and `PXVIMM IMM SHORT LIST` (domain: immunizations)
- **index.ts**: Import + register `immunizationsRoutes`
- **portal-auth.ts**: Added `/portal/health/immunizations` handler using `portalRpc()`
- **portal-pdf.ts**: Updated `formatImmunizationsForPdf()` to handle `name` field from real VistA data

### Web (apps/web)
- **ImmunizationsPanel.tsx**: Full clinician panel with list table, detail pane, integration-pending banner, disabled add button
- **panels/index.ts**: Added barrel export
- **chart page**: Added `immunizations` to `VALID_TABS`, import, and switch case
- **tabs.json**: Added `CT_IMMUNIZATIONS` (id: 16, creationOrder: 14)
- **CoverSheetPanel.tsx**: Added Immunizations section fetching from `/vista/immunizations`
- **actionRegistry.ts**: Added `immunizations.list`, `immunizations.catalog` (wired), `immunizations.add` (pending)

### Portal (apps/portal)
- **immunizations/page.tsx**: Patient immunization history page with DataSourceBadge + PDF export
- **api.ts**: Added `fetchImmunizations()` helper

### Config
- **capabilities.json**: Added `clinical.immunizations.list` (live) and `clinical.immunizations.add` (pending)

### Artifacts
- `artifacts/phase65/inventory.json` — codebase inventory + Vivian RPCs
- `artifacts/phase65/immu-plan.json` — VistA-first implementation plan

## How to Test Manually
1. Start VistA Docker: `cd services/vista && docker compose up -d`
2. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
3. `curl http://127.0.0.1:3001/vista/immunizations?dfn=3` — should return immunization list
4. `curl http://127.0.0.1:3001/vista/immunizations/catalog` — should return type picker
5. `curl -X POST http://127.0.0.1:3001/vista/immunizations?dfn=3` — should return 202 pending
6. Navigate to CPRS chart > Immunizations tab — should show panel
7. Navigate to portal dashboard/immunizations — should show patient page

## Verifier Output
```
scripts/verify-phase65-immunizations.ps1: 50/50 PASS, 0 FAIL
scripts/verify-latest.ps1 -SkipDocker: 65/66 (pre-existing TSC gate)
```

## Follow-ups
- Phase 65B: Wire PX SAVE DATA for add-immunization (requires PCE encounter context)
- Phase 65C: PXVIMM VIMM DATA for detailed immunization records
- Phase 65D: ICE web service recommendations (PX ICE WEB)
