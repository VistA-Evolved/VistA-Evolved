# Phase 56 -- CPRS Parity Wave 1 (READ) + Cover Sheet Layout Manager

## What Changed

### A. Wave Plan (artifacts/cprs/wave56-plan.json)
- Machine-readable plan: 6 screens, 18 actions (16 wired, 2 integration-pending)
- Screens: cover-sheet, problems-tab, meds-tab, orders-tab, notes-tab, labs-tab

### B. API Endpoints (apps/api/src/routes/cprs/wave1-routes.ts)
New Fastify plugin with 6 endpoints:
- `GET /vista/cprs/orders-summary` -- ORWORB UNSIG ORDERS
- `GET /vista/cprs/appointments` -- integration-pending (SD API)
- `GET /vista/cprs/reminders` -- integration-pending (ORQQPX)
- `GET /vista/cprs/meds/detail` -- ORWORR GETTXT
- `GET /vista/cprs/labs/chart` -- ORWLRR CHART
- `GET /vista/cprs/problems/icd-search` -- ORQQPL4 LEX

Registered in index.ts after migration routes.

### C. Action Registry (apps/web/src/actions/actionRegistry.ts)
- Added `endpoint?: string` field to CprsAction interface
- Added endpoint URLs to all relevant existing actions
- Added 4 new CoverSheet actions: cover.load-labs, cover.load-orders, cover.load-appointments (pending), cover.load-reminders (pending)
- Total actions: 52 (50 wired, 2 integration-pending, 2 stub)

### D. Cover Sheet Panel (apps/web/src/components/cprs/panels/CoverSheetPanel.tsx)
- Expanded from 6 to 9 sections: +Recent Labs, +Orders Summary, +Appointments (pending), +Clinical Reminders (pending)
- Integration-pending sections show PENDING badge; clicking opens IntegrationPendingModal
- Labs section uses existing data-cache labs fetcher
- Orders Summary section fetches from new `/vista/cprs/orders-summary` endpoint
- Panel heights now persist to localStorage via cprs-ui-state

### E. IntegrationPendingModal (apps/web/src/components/cprs/IntegrationPendingModal.tsx)
- New modal showing target RPCs, Vivian presence badges, next steps
- Prevents dead clicks: every pending action surfaces this instead of silently failing

### F. Cover Sheet Layout Manager (apps/web/src/components/cprs/CoverSheetLayoutManager.tsx)
- Toolbar showing panel count and custom height count
- Reset Layout button restores all panel heights to defaults
- Integrated above cover sheet grid in chart page

### G. Action Inspector (apps/web/src/components/cprs/ActionInspector.tsx)
- Dev-only overlay (hidden in production)
- Shows action->endpoint->RPC mappings filtered by current tab
- Toggle via Ctrl+Shift+J
- Stats bar: total/wired/pending/stub/RPCs

### H. UI State Store (apps/web/src/stores/cprs-ui-state.tsx)
- Default layout expanded to 9 panels (added labs, orders, appointments)
- Added `resetCoverSheetLayout()` method

### I. CSS (apps/web/src/components/cprs/cprs.module.css)
- Added `.pendingBadge` class

## How to Test Manually

1. Start API: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. Start web: `cd apps/web && pnpm dev`
3. Login, select patient, open Cover Sheet tab
4. Verify 9 sections visible: Problems, Allergies, Meds, Vitals, Notes, Labs, Orders Summary, Appointments, Reminders
5. Click PENDING badge on Appointments or Reminders -> IntegrationPendingModal opens
6. Resize a panel -> navigate away and back -> height persists
7. Click "Reset Layout" -> all heights reset to 33
8. Press Ctrl+Shift+J -> Action Inspector opens showing all CoverSheet actions
9. Run verifier: `.\scripts\verify-latest.ps1`

## Verifier Output

```
=== Phase 56 Verification: CPRS Wave 1 (READ) + Cover Sheet Layout ===
  PASS  G56-1   wave56-plan.json exists with >= 6 screens, >= 18 actions
  PASS  G56-2   Wave 1 API routes file exists with >= 6 endpoints
  PASS  G56-3   Action registry has endpoint field and >= 52 actions
  PASS  G56-4   CoverSheetPanel has 9 sections
  PASS  G56-5   IntegrationPendingModal exists
  PASS  G56-6   CoverSheetLayoutManager exists with reset-to-default
  PASS  G56-7   ActionInspector exists with dev-only gate
  PASS  G56-8   cprs-ui-state has resetCoverSheetLayout + 9-panel default
  PASS  G56-9   No mock/fake/hardcoded data in Wave 1 files
  PASS  G56-10  Pending actions wire to IntegrationPendingModal
  PASS: 10 / All gates passed.
```

## Follow-ups
- Wave 2: WRITE actions (add problem, add allergy, create note, save order)
- Wire appointments when SD APPOINTMENT files are populated in sandbox
- Wire clinical reminders when PXRM package config is loaded
- Add drag-and-drop panel reordering to CoverSheetLayoutManager
