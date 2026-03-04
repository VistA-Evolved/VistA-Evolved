# CPRS Web Replica v1 — Runbook

## Overview

Phase 11 delivers a contract-driven CPRS web replica with full navigation, all 10 chart tabs, menus, dialogs, and live VistA API integration.

## Architecture

### Route Structure

| Route                        | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `/cprs/login`                | Sign-on simulation (API health check)        |
| `/cprs/patient-search`       | Patient selection with search + default list |
| `/cprs/chart/[dfn]/[tab]`    | Main chart shell with 10 tab panels          |
| `/cprs/settings/preferences` | Theme, density, initial tab preferences      |
| `/cprs/verify`               | Automated verification dashboard (15 checks) |

### State Model

- **PatientProvider** — Selected patient DFN + demographics from API
- **CPRSUIProvider** — UI preferences (theme/density/initialTab) + modal state, persisted to localStorage
- **DataCacheProvider** — Per-DFN clinical data cache (allergies, problems, vitals, notes, medications, orders)

### Contract Binding

Contracts loaded from `design/contracts/cprs/v1/`:

- `tabs.json` → 10 chart tabs (sorted Cover Sheet first, then by creationOrder)
- `menus.json` → 1688 menu items → 5 top-level menus (File/Edit/View/Tools/Help)

## Tab Panels

| Tab         | Component       | Data Source             | Features                               |
| ----------- | --------------- | ----------------------- | -------------------------------------- |
| Cover Sheet | CoverSheetPanel | All API domains         | 6-section resizable grid               |
| Problems    | ProblemsPanel   | GET /vista/problems     | List/detail, filter, add/edit dialogs  |
| Meds        | MedsPanel       | GET /vista/medications  | List/detail, status chips, filter      |
| Orders      | OrdersPanel     | POST /vista/medications | 4 sub-tabs (Med/Lab/Imaging/Consult)   |
| Notes       | NotesPanel      | GET/POST /vista/notes   | Template selector, create flow         |
| Consults    | ConsultsPanel   | Mock dataset            | List/detail, filter (pending API)      |
| Surgery     | SurgeryPanel    | Mock dataset            | List/detail (pending API)              |
| D/C Summ    | DCSummPanel     | Mock dataset            | Full text discharge summaries          |
| Labs        | LabsPanel       | Mock dataset            | List/detail, acknowledge (pending API) |
| Reports     | ReportsPanel    | Mock dataset            | Category tree + report viewer          |

## Dialogs

- **Add Problem** — ICD lexicon lookup pending; saves as local draft
- **Edit Problem** — Status + comment editing (local only)
- **Add Medication** — Quick order via API (Phase 8B AUTOACK) or manual draft

## Prerequisites

1. Docker VistA running on port 9430: `docker compose -f services/vista/docker-compose.yml up -d`
2. API server running on port 3001: `pnpm -C apps/api dev`
3. Web server: `pnpm -C apps/web dev`

## Verification

```powershell
# Automated script (60+ checks)
.\scripts\verify-phase1-to-phase11-cprs.ps1

# Build check
pnpm -C apps/web build

# Browser verification
# Navigate to http://localhost:3000/cprs/verify
```

## Known Limitations

- Labs, Reports, Consults, Surgery, D/C Summ use mock data (API integration pending)
- Add Problem requires ICD lexicon lookup (ORQQPL4 LEX) not yet wired
- Manual medication orders save as local drafts only
- Edit Problem changes are local only (ORQQPL EDIT SAVE not wired)
- Cover Sheet Clinical Reminders section shows "pending" status

## Files Created/Modified

See `prompts/13-PHASE-11-CPRS-WEB-REPLICA/13-01-Phase11-CPRS-Web-Replica-IMPLEMENT.md` for full file list.
