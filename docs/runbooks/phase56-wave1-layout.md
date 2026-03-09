# Phase 56: CPRS Parity Wave 1 (READ) + Cover Sheet Layout Manager

## Overview

Wave 1 of CPRS functional parity implementation. Ensures the web UI matches
CPRS behavior for core READ workflows across cover sheet, problems, meds,
orders, notes, and labs tabs.

Current recovery note: the cover sheet immunizations card now clears stale
pending posture on each fetch and only shows `PENDING` when the latest
`GET /vista/immunizations?dfn=` response is actually unavailable or returns
pending targets. Live empty responses render `No immunizations on record`.

Current recovery note: the cover sheet reminders card now distinguishes live
empty reminder results from route failure. `GET /vista/cprs/reminders?dfn=`
drives the card directly, so route failure shows the existing pending badge and
pending modal, while live empty responses still render `No clinical reminders due`.

Current recovery note: the cover sheet orders summary card now uses the acting
clinician DUZ to query `ORWORB UNSIG ORDERS` and only treats the result as empty
when the route returns a live empty response. If the RPC is unavailable on the
current VistA instance, the card now shows pending posture instead of `No unsigned orders`.

Current recovery note: when `ORWORB UNSIG ORDERS` is unavailable but the
recovered active-orders path can still prove unsigned orders, `GET /vista/cprs/orders-summary?dfn=`
now falls back to `ORWORR AGET` plus live order-text enrichment so the Cover Sheet
shows the same unsigned order posture already visible on the Orders tab instead of
staying permanently pending.

Current recovery note: the cache-backed cover sheet cards for problems,
allergies, medications, vitals, notes, and labs now preserve per-domain fetch
posture from `useDataCache()`. When the latest VistA-backed read returns
`ok:false`, integration-pending status, or request failure, those cards show the
existing pending badge/modal instead of false empty-state copy.

## New API Endpoints

| Endpoint                                    | RPC                        | Status              |
| ------------------------------------------- | -------------------------- | ------------------- |
| `GET /vista/cprs/orders-summary?dfn=`       | ORWORB UNSIG ORDERS with ORWORR fallback | wired |
| `GET /vista/cprs/appointments?dfn=`         | SD API APPOINTMENTS BY DFN | integration-pending |
| `GET /vista/cprs/reminders?dfn=`            | ORQQPX REMINDERS LIST      | integration-pending |
| `GET /vista/cprs/meds/detail?orderId=`      | ORWORR GETTXT              | wired               |
| `GET /vista/cprs/labs/chart?dfn=&testName=` | ORWLRR CHART               | wired               |
| `GET /vista/cprs/problems/icd-search?term=` | ORQQPL4 LEX                | wired               |

## Cover Sheet Sections (9 total)

1. Active Problems -- ORQQPL PROBLEM LIST
2. Allergies / Adverse Reactions -- ORQQAL LIST
3. Active Medications -- ORWPS ACTIVE
4. Vitals -- ORQQVI VITALS
5. Recent Notes -- TIU DOCUMENTS BY CONTEXT
6. Recent Labs -- ORWLRR INTERIM (Phase 56 new)
7. Orders Summary -- ORWORB UNSIG ORDERS with ORWORR AGET/GETTXT/GETBYIFN fallback (Phase 56 new)
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

- Shown when clicking PENDING badge on cover sheet sections whose latest fetch
	is unavailable or integration-pending
- Displays target RPCs and their Vivian presence status
- Prevents dead clicks per governance rules

## Verification

```powershell
.\scripts\verify-phase56-wave1-layout.ps1
```

10 gates covering structure, no-mock, dead-click audit, layout persistence.
