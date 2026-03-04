# Phase 32 IMPLEMENT -- Secure Messaging + Refill Requests + Tasks (VistA-first)

## User Request

```
PHASE 32 -- SECURE MESSAGING + REFILL REQUESTS + TASKS (VistA-first)

A) Messaging
- Patient can send message to clinic/team; proxy can send on behalf where permitted
- Clinician can reply in CPRS shell
- Attachments policy (OFF by default; add later with scanning)
- Abuse controls: rate limits, throttling, blocklist, audit

B) Refill requests
- Patient can request refill renewal for a medication
- VistA-first: if renewal RPC is available, call it; else store request with explicit "pending filing" banner and target RPC documented

C) Tasks/notifications
- Patient sees tasks: forms due, appointment reminders, messages unread, refill status
- Staff sees queue in CPRS shell

D) Docs
- docs/runbooks/phase32-messaging-refills.md

Commit: "Phase 32: Messaging + refills + tasks (VistA-first)"
```

## Implementation Steps

### A) Messaging enhancements (portal-messaging.ts)

1. Add proxy send support (check proxy relationship + sensitivity)
2. Add clinician reply function (for CPRS shell)
3. Attachments OFF by default (config flag `PORTAL_ATTACHMENTS_ENABLED`)
4. Rate limiting: max 10 messages/hour per patient
5. Blocklist: configurable blocked words/phrases
6. All actions audited

### B) Refill requests (portal-refills.ts -- NEW)

1. RefillRequest type with status workflow: requested -> pending_review -> approved/denied/filed
2. VistA-first: attempt PSO RENEW or store with `vistaSync: "pending_filing"` + banner
3. Target RPC documented: `PSO RENEW` (Outpatient Pharmacy)
4. Proxy can request if accessLevel = read_write
5. Demo seed data for dev patient

### C) Tasks/notifications (portal-tasks.ts -- NEW)

1. Task types: form_due, appointment_reminder, message_unread, refill_status, general
2. Auto-generate from other stores (appointments, messages, refills)
3. Patient-facing: GET /portal/tasks
4. Staff-facing: GET /portal/staff/tasks (for CPRS shell)
5. Mark complete/dismiss

### D) Route wiring

1. Add refill + task routes to portal-core.ts
2. Add CPRS panel: MessagingTasksPanel.tsx (staff queue for messages + tasks)
3. Add portal pages: /dashboard/refills, /dashboard/tasks

### E) Portal UI

1. Refills page: list meds, request refill button, status tracking
2. Tasks page: unified task list with badges
3. Nav entries for Refills + Tasks

### F) CPRS shell

1. MessagingTasksPanel: staff sees patient messages queue + task queue
2. Wire into tab strip + chart page

## Files Touched

### New files

- apps/api/src/services/portal-refills.ts
- apps/api/src/services/portal-tasks.ts
- apps/portal/src/app/dashboard/refills/page.tsx
- apps/portal/src/app/dashboard/tasks/page.tsx
- apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx
- docs/runbooks/phase32-messaging-refills.md

### Modified files

- apps/api/src/services/portal-messaging.ts (proxy, rate limit, blocklist, clinician reply)
- apps/api/src/services/portal-audit.ts (new action types)
- apps/api/src/routes/portal-core.ts (new routes)
- apps/portal/src/components/portal-nav.tsx (new nav items)
- apps/portal/src/lib/api.ts (new API functions)
- apps/web/src/components/cprs/panels/index.ts (barrel export)
- apps/web/src/components/cprs/CPRSTabStrip.tsx (TAB_TO_MODULE)
- apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx (new panel case)
- apps/web/src/lib/contracts/data/tabs.json (new tab entry)
- apps/api/src/index.ts (route init)

## Verification Steps

- TSC clean (api + portal + web)
- All new routes accessible
- Proxy messaging respects sensitivity
- Rate limit enforced
- Refill request workflow complete
- Task aggregation from all sources
- CPRS panel wired
