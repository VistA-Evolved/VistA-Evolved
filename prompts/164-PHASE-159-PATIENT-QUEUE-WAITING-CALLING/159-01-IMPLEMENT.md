# Phase 159-01: IMPLEMENT — Patient Queue / Waiting / Numbering / Calling System

## Objective

Build a department-level patient queue system with ticket numbering, priority
triage, calling display, and front-desk management. Integrates with the existing
Phase 139 check-in lifecycle and SDES CHECKIN RPC.

## Implementation Steps

### 1. Backend: Queue Engine (`apps/api/src/queue/`)

- `types.ts` — QueueTicket, QueueEvent, QueueConfig, DepartmentQueue, TicketStatus
- `queue-engine.ts` — In-memory queue store with:
  - Ticket creation (auto-numbering per department per day)
  - Priority levels: urgent, high, normal, low
  - Status lifecycle: waiting → called → serving → completed / no-show
  - Department routing (ED, Lab, Radiology, Pharmacy, etc.)
  - Average wait time calculation
  - Event logging for every state transition
- `queue-routes.ts` — REST API endpoints (~15)
- `index.ts` — Barrel export

### 2. Database Tables

- `queue_ticket` — id, tenant_id, department, ticket_number, patient_dfn,
  patient_name, priority, status, provider_duz, window_number, created_at,
  called_at, served_at, completed_at
- `queue_event` — id, tenant_id, ticket_id, event_type, actor_duz, detail,
  created_at
- PG migration v24, SQLite DDL, RLS entries

### 3. API Endpoints

| Method | Path                        | Auth    | Description                        |
| ------ | --------------------------- | ------- | ---------------------------------- |
| POST   | /queue/tickets              | session | Create ticket (on check-in)        |
| GET    | /queue/tickets?dept=X       | session | List active tickets for department |
| POST   | /queue/tickets/:id/call     | session | Call next ticket (front desk)      |
| POST   | /queue/tickets/:id/serve    | session | Start serving                      |
| POST   | /queue/tickets/:id/complete | session | Complete visit                     |
| POST   | /queue/tickets/:id/no-show  | session | Mark no-show                       |
| POST   | /queue/tickets/:id/transfer | session | Transfer to another dept           |
| GET    | /queue/display/:dept        | none    | Public display board (no auth)     |
| GET    | /queue/stats/:dept          | session | Wait time + volume stats           |
| GET    | /queue/departments          | session | List configured departments        |
| POST   | /queue/departments          | admin   | Configure department queue         |

### 4. Store Policy Registration

- queue-ticket-store: critical, pg_backed
- queue-event-store: audit, pg_backed

### 5. UI Pages

- `/cprs/admin/queue` — Front desk queue management dashboard
- Public display component (embeddable, no-auth)

### 6. Integration Points

- Phase 139: Hook into check-in lifecycle to auto-create queue ticket
- SDES CHECKIN RPC: Queue ticket creation after VistA check-in success
- Department → Phase 160 workflows (forward reference)

## Files to Create/Modify

| Action | File                                               |
| ------ | -------------------------------------------------- |
| CREATE | apps/api/src/queue/types.ts                        |
| CREATE | apps/api/src/queue/queue-engine.ts                 |
| CREATE | apps/api/src/queue/queue-routes.ts                 |
| CREATE | apps/api/src/queue/index.ts                        |
| MODIFY | apps/api/src/index.ts (register routes)            |
| MODIFY | apps/api/src/platform/db/schema.ts (+2 tables)     |
| MODIFY | apps/api/src/platform/db/migrate.ts (+DDL)         |
| MODIFY | apps/api/src/platform/pg/pg-migrate.ts (+v24)      |
| MODIFY | apps/api/src/platform/store-policy.ts (+2 entries) |
| CREATE | apps/web/src/app/cprs/admin/queue/page.tsx         |
| CREATE | docs/runbooks/phase159-patient-queue.md            |
