# Phase 11 — CPRS Web Replica v1 — Ops Summary

## What Changed

### New Files (30+)
- **Contract Layer**: `apps/web/src/lib/contracts/types.ts`, `loader.ts`, `data/tabs.json`, `data/menus.json`
- **State Stores**: `apps/web/src/stores/patient-context.tsx`, `cprs-ui-state.tsx`, `data-cache.tsx`
- **CPRS Shell**: `components/cprs/cprs.module.css`, `CPRSMenuBar.tsx`, `PatientBanner.tsx`, `CPRSTabStrip.tsx`, `CPRSModals.tsx`
- **Tab Panels** (10): CoverSheet, Problems, Meds, Orders, Notes, Consults, Surgery, DCSumm, Labs, Reports
- **Dialogs** (3): AddProblem, EditProblem, AddMedication
- **Route Pages** (6): `/cprs/layout`, `/cprs/login`, `/cprs/patient-search`, `/cprs/chart/[dfn]/[tab]`, `/cprs/settings/preferences`, `/cprs/verify`
- **Verification**: `scripts/verify-phase1-to-phase11-cprs.ps1` (82 checks)
- **Prompts**: `prompts/13-PHASE-11-CPRS-WEB-REPLICA/13-01-*`, `13-02-*`
- **Runbook**: `docs/runbooks/cprs-web-replica-v1.md`

### Modified Files
- `apps/api/package.json` — added `--env-file=.env.local` to dev/start scripts
- `apps/web/src/app/page.tsx` — root page now links to CPRS routes
- `scripts/verify-latest.ps1` — points to phase 11 script

## How to Test Manually

1. Start Docker VistA: `cd services/vista && docker compose --profile dev up -d`
2. Start API: `pnpm -C apps/api dev`
3. Build web: `pnpm -C apps/web build`
4. Start web: `pnpm -C apps/web dev`
5. Navigate to `http://localhost:3000/cprs/login`
6. Search patients (e.g., "ZZ") — finds 3 test patients
7. Select patient — chart opens with 10 tabs
8. Tab through all tabs
9. Visit `http://localhost:3000/cprs/verify` — all checks green

## Verifier Output

```
PASS: 82  FAIL: 0  WARN: 0  TOTAL: 82
*** ALL CHECKS PASSED ***
```

Script: `scripts/verify-phase1-to-phase11-cprs.ps1`

## Follow-Ups
- Wire Labs/Reports/Consults/Surgery/DCSumm to real VistA RPCs
- Add ICD/LEX lookup for Add Problem dialog
- Real order signing workflow
- Keyboard navigation and accessibility
- See `ops/known-gaps.md` for full gap inventory

## Verification Audit (Phase 11 VERIFY pass)

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
