# Phase 32 — Secure Messaging + Refill Requests + Tasks

## Overview

Phase 32 adds three interconnected patient portal capabilities:

1. **Messaging enhancements** — proxy send-on-behalf, clinician reply from CPRS,
   abuse controls (rate limiter, blocklist), attachments OFF by default
2. **Refill requests** — patient-initiated medication refill workflow with
   VistA-first pattern (target RPC: `PSO RENEW`)
3. **Tasks & notifications** — unified task feed aggregating appointments,
   messages, refills, and clinical reminders

## Architecture

All three services follow the in-memory `Map<>` store pattern established
in Phase 23 (imaging worklist) and Phase 27 (portal messaging).

### Refill Request Flow

```
Patient submits refill
  → Rate limit check (5/hour)
  → Duplicate pending check
  → Store with status: "requested"
  → Audit: portal.refill.request

Staff reviews in CPRS Tasks tab
  → Approve: status → "approved", vistaSync → "pending_filing"
  → Deny: status → "denied"
  → Audit: portal.refill.approve / portal.refill.deny

VistA filing (future):
  → PSO RENEW RPC → vistaSync → "filed", vistaRef → PSO IEN
```

### Task Categories

| Category             | Source                   | Auto-generated |
| -------------------- | ------------------------ | -------------- |
| appointment_reminder | portal-appointments      | Yes            |
| message_unread       | portal-messaging         | Yes            |
| refill_status        | portal-refills           | Yes            |
| form_due             | Staff / system           | Staff-created  |
| lab_result           | Future VistA integration | System         |
| general              | Staff                    | Staff-created  |

## API Endpoints

### Patient-facing (portal auth)

| Method | Path                       | Description                                    |
| ------ | -------------------------- | ---------------------------------------------- |
| GET    | /portal/refills            | List patient's refill requests                 |
| POST   | /portal/refills            | Submit refill request                          |
| POST   | /portal/refills/:id/cancel | Cancel pending refill                          |
| GET    | /portal/tasks              | List patient tasks (filter by status/category) |
| GET    | /portal/tasks/counts       | Badge counts by category                       |
| POST   | /portal/tasks/:id/dismiss  | Dismiss a task                                 |
| POST   | /portal/tasks/:id/complete | Mark task complete                             |

### Staff-facing (CPRS shell / portal auth)

| Method | Path                             | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| GET    | /portal/staff/refills            | Pending refill queue             |
| POST   | /portal/staff/refills/:id/review | Approve/deny with note           |
| GET    | /portal/staff/tasks              | All active tasks across patients |
| GET    | /portal/staff/messages           | Unread patient message queue     |
| POST   | /portal/staff/messages/:id/reply | Clinician reply to patient       |

## CPRS Integration

New **Tasks** tab (CT_TASKS, id: 14) in the CPRS chart tab strip with
three sub-tabs:

- **Messages**: Unread patient messages with reply action
- **Refills**: Pending refill requests with approve/deny actions
- **Tasks**: Active tasks with priority sorting

The chart-scoped Tasks tab must stay patient-scoped. When loaded inside
`/cprs/chart/:dfn/tasks`, the panel should request the staff queue endpoints
with the current chart DFN so clinicians do not see or act on another
patient's queue items from the wrong chart context.

## Abuse Controls

| Control            | Value                             | Configurable via                  |
| ------------------ | --------------------------------- | --------------------------------- |
| Message rate limit | 10/hour per patient               | Code constant                     |
| Refill rate limit  | 5/hour per patient                | Code constant                     |
| Blocklist words    | From `PORTAL_BLOCKLIST_WORDS` env | Comma-separated                   |
| Attachments        | OFF by default                    | `PORTAL_ATTACHMENTS_ENABLED=true` |

## Files Changed

### API (apps/api/src/)

- `services/portal-messaging.ts` — Phase 32 enhancements (proxy, clinician reply, abuse controls)
- `services/portal-refills.ts` — NEW: Refill request service
- `services/portal-tasks.ts` — NEW: Tasks/notifications service
- `services/portal-audit.ts` — Added 9 new audit action types
- `routes/portal-core.ts` — Added 10 new route handlers

### CPRS Web (apps/web/src/)

- `components/cprs/panels/MessagingTasksPanel.tsx` — NEW: Staff panel
- `components/cprs/panels/index.ts` — Barrel export
- `components/cprs/CPRSTabStrip.tsx` — tasks module mapping
- `app/cprs/chart/[dfn]/[tab]/page.tsx` — Tasks tab wiring
- `lib/contracts/data/tabs.json` — CT_TASKS entry (id: 14)

### Portal (apps/portal/src/)

- `app/dashboard/refills/page.tsx` — NEW: Refill requests page
- `app/dashboard/tasks/page.tsx` — NEW: Tasks page
- `app/dashboard/medications/page.tsx` — Updated refills section link
- `components/portal-nav.tsx` — Added Tasks + Refill Requests nav items
- `lib/api.ts` — Added refill + task API client functions

## Manual Test Steps

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Login to portal, get cookie
curl -X POST http://localhost:3001/portal/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# 3. Test refills
curl http://localhost:3001/portal/refills -b cookies.txt
curl -X POST http://localhost:3001/portal/refills \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"medicationName":"ASPIRIN 81MG TAB","medicationId":"med-2001"}'

# 4. Test tasks
curl http://localhost:3001/portal/tasks -b cookies.txt
curl http://localhost:3001/portal/tasks/counts -b cookies.txt

# 5. Test staff queues
curl http://localhost:3001/portal/staff/refills -b cookies.txt
curl http://localhost:3001/portal/staff/messages -b cookies.txt
curl http://localhost:3001/portal/staff/tasks -b cookies.txt
```

## VistA-First Migration Path

### Refills → VistA

1. Check `PSO RENEW` RPC availability via capability cache
2. If available: call with medication IEN + patient DFN
3. Store VistA IEN in `vistaRef`, set `vistaSync: "filed"`
4. If unavailable: keep `vistaSync: "pending_filing"` banner

### Tasks → VistA ORB Notifications

1. Map task categories to ORB notification types
2. Read via `ORB SORT METHOD` / `ORB LIST` RPCs
3. Merge portal tasks with VistA notifications
4. Write back via `ORB DELETE ALERT` for dismissals
