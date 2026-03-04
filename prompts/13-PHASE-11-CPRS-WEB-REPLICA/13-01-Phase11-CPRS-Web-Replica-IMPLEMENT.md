# Phase 11 — CPRS Web Replica End-to-End (IMPLEMENT)

## User Request

Build the full CPRS web replica: contract-driven architecture, new CPRS route namespace, state model, all 10 tab panels wired with list/detail/add/edit flows, menus (File/Edit/View/Tools/Help), modals, dialogs, old UI quarantine, verification page + script, prompts, and docs. No VA/VHA terminology in UI strings.

## Implementation Steps

### A) Contract Binding Layer

1. Create `apps/web/src/lib/contracts/types.ts` — TS types for all 5 contract JSONs
2. Create `apps/web/src/lib/contracts/loader.ts` — validated loader with getChartTabs(), getFrameMenu(), sanitizeLabel()

### B) State Management

3. Create `apps/web/src/stores/patient-context.tsx` — PatientProvider with selectPatient/clearPatient
4. Create `apps/web/src/stores/cprs-ui-state.tsx` — CPRSUIProvider with preferences + modal state + localStorage
5. Create `apps/web/src/stores/data-cache.tsx` — DataCacheProvider with per-DFN domain caching

### C) CPRS Shell Components

6. Create `apps/web/src/components/cprs/cprs.module.css` — full theme (light/dark) + density + all component styles
7. Create `apps/web/src/components/cprs/CPRSMenuBar.tsx` — File/Edit/View/Tools/Help with action routing
8. Create `apps/web/src/components/cprs/PatientBanner.tsx` — patient demographics banner
9. Create `apps/web/src/components/cprs/CPRSTabStrip.tsx` — contract-driven tab strip
10. Create `apps/web/src/components/cprs/CPRSModals.tsx` — 6 global modals + 3 dialog routers

### D) Tab Panels (all 10)

11. CoverSheetPanel — 6-section resizable grid with live API data
12. ProblemsPanel — split list/detail, filter, add/edit with modal dispatch
13. MedsPanel — split list/detail, status chips, filter
14. OrdersPanel — Order Composer with 4 sub-tabs (Med/Lab/Imaging/Consult)
15. NotesPanel — template selector, create flow with API POST
16. ConsultsPanel — list/detail, filter, mock dataset
17. SurgeryPanel — list/detail, mock dataset
18. DCSummPanel — list/detail, full text view
19. LabsPanel — list/detail, acknowledge results
20. ReportsPanel — category tree + report viewer

### E) Dialog Components

21. AddProblemDialog — ICD/LEX blocker noted, saves local drafts
22. EditProblemDialog — status + comment editing
23. AddMedicationDialog — quick order (API) + manual entry (local draft)

### F) CPRS Route Pages

24. `apps/web/src/app/cprs/layout.tsx` — wraps PatientProvider + CPRSUIProvider + DataCacheProvider + Modals
25. `apps/web/src/app/cprs/login/page.tsx` — access/verify sign-on simulation
26. `apps/web/src/app/cprs/patient-search/page.tsx` — search + default list + open chart
27. `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` — main chart shell with all 10 tab panels
28. `apps/web/src/app/cprs/settings/preferences/page.tsx` — theme/density/initialTab preferences
29. `apps/web/src/app/cprs/verify/page.tsx` — automated verification dashboard (15 checks)

### G) UI Cleanup

30. Update root page.tsx to link to CPRS login + verify dashboard
31. Keep old routes as "Legacy" links

### H) Verification

32. Create `scripts/verify-phase1-to-phase11-cprs.ps1` — 60+ checks
33. Update `scripts/verify-latest.ps1` to point to new script

### I) Documentation

34. Create runbook `docs/runbooks/cprs-web-replica-v1.md`
35. Create prompt files (IMPLEMENT + VERIFY)

## Verification Steps

- Run `scripts/verify-phase1-to-phase11-cprs.ps1`
- Run `pnpm -C apps/web build` — must compile without errors
- Navigate to `/cprs/login` → `/cprs/patient-search` → `/cprs/chart/{dfn}/cover`
- Click through all 10 tabs
- Open File/Edit/View/Tools/Help menus
- Test Add Problem, Add Medication dialogs
- Visit `/cprs/verify` page

## Files Touched

- `apps/web/src/lib/contracts/types.ts` (new)
- `apps/web/src/lib/contracts/loader.ts` (new)
- `apps/web/src/stores/patient-context.tsx` (new)
- `apps/web/src/stores/cprs-ui-state.tsx` (new)
- `apps/web/src/stores/data-cache.tsx` (new)
- `apps/web/src/components/cprs/cprs.module.css` (new)
- `apps/web/src/components/cprs/CPRSMenuBar.tsx` (new)
- `apps/web/src/components/cprs/PatientBanner.tsx` (new)
- `apps/web/src/components/cprs/CPRSTabStrip.tsx` (new)
- `apps/web/src/components/cprs/CPRSModals.tsx` (new)
- `apps/web/src/components/cprs/panels/*.tsx` (10 new)
- `apps/web/src/components/cprs/panels/index.ts` (new)
- `apps/web/src/components/cprs/dialogs/*.tsx` (3 new)
- `apps/web/src/components/cprs/dialogs/index.ts` (new)
- `apps/web/src/app/cprs/layout.tsx` (new)
- `apps/web/src/app/cprs/login/page.tsx` (new)
- `apps/web/src/app/cprs/patient-search/page.tsx` (new)
- `apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx` (new)
- `apps/web/src/app/cprs/settings/preferences/page.tsx` (new)
- `apps/web/src/app/cprs/verify/page.tsx` (new)
- `apps/web/src/app/page.tsx` (modified)
- `scripts/verify-phase1-to-phase11-cprs.ps1` (new)
- `scripts/verify-latest.ps1` (modified)
- `docs/runbooks/cprs-web-replica-v1.md` (new)
