# Phase 56: CPRS Parity Wave 1 (READ) + Cover Sheet Layout Manager

## Overview
Wave 1 of CPRS functional parity implementation. Ensures the web UI matches
CPRS behavior for core READ workflows across cover sheet, problems, meds,
orders, notes, and labs tabs.

## New API Endpoints

| Endpoint | RPC | Status |
|----------|-----|--------|
| `GET /vista/cprs/orders-summary?dfn=` | ORWORB UNSIG ORDERS | wired |
| `GET /vista/cprs/appointments?dfn=` | SD API APPOINTMENTS BY DFN | integration-pending |
| `GET /vista/cprs/reminders?dfn=` | ORQQPX REMINDERS LIST | integration-pending |
| `GET /vista/cprs/meds/detail?orderId=` | ORWORR GETTXT | wired |
| `GET /vista/cprs/labs/chart?dfn=&testName=` | ORWLRR CHART | wired |
| `GET /vista/cprs/problems/icd-search?term=` | ORQQPL4 LEX | wired |

## Cover Sheet Sections (9 total)

1. Active Problems -- ORQQPL PROBLEM LIST
2. Allergies / Adverse Reactions -- ORQQAL LIST
3. Active Medications -- ORWPS ACTIVE
4. Vitals -- ORQQVI VITALS
5. Recent Notes -- TIU DOCUMENTS BY CONTEXT
6. Recent Labs -- ORWLRR INTERIM (Phase 56 new)
7. Orders Summary -- ORWORB UNSIG ORDERS (Phase 56 new)
8. Appointments -- integration-pending (Phase 56 new)
9. Clinical Reminders -- integration-pending (Phase 56 new)

## Layout Manager

- Toolbar above cover grid with panel count and custom height count
- "Reset Layout" button resets all heights to default (33)
- Heights persist to localStorage automatically (300ms debounce)

## Action Inspector (Dev Only)

- Toggle: Ctrl+Shift+J
- Shows action->endpoint->RPC mapping for current tab
- Hidden in production builds

## Integration Pending Modal

- Shown when clicking PENDING badge on appointments or reminders sections
- Displays target RPCs and their Vivian presence status
- Prevents dead clicks per governance rules

## Verification

```powershell
.\scripts\verify-phase56-wave1-layout.ps1
```

10 gates covering structure, no-mock, dead-click audit, layout persistence.
