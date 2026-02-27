# Phase 159 — Patient Queue / Waiting / Numbering / Calling System

## Overview
Phase 159 provides a department-level patient queue system with auto-numbering,
priority triage (urgent/high/normal/low), calling display boards, and front-desk
management. Integrates with the existing Phase 139 check-in lifecycle.

## Architecture

### Backend (`apps/api/src/queue/`)
| File | Purpose |
|------|---------|
| `types.ts` | QueueTicket, QueueEvent, DepartmentQueueConfig, QueueDisplayBoard, QueueStats |
| `queue-engine.ts` | In-memory queue store, priority ordering, daily ticket numbering, department routing |
| `queue-routes.ts` | Fastify REST API plugin (~15 endpoints) |
| `index.ts` | Barrel export |

### Database
- **SQLite**: `queue_ticket`, `queue_event` (auto-created via migrate.ts)
- **PostgreSQL**: Migration v24 (`phase159_patient_queue`) with UUID, TIMESTAMPTZ
- **RLS**: Both tables in `tenantTables` array with `tenant_id` column

### UI
| Page | Path |
|------|------|
| Queue Management | `/cprs/admin/queue` |

## API Endpoints

### Queue Management (session auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/queue/tickets` | Create ticket |
| GET | `/queue/tickets?dept=X` | List active tickets |
| GET | `/queue/tickets/:id` | Get single ticket |
| GET | `/queue/tickets/:id/events` | Get ticket events |
| POST | `/queue/tickets/:id/call` | Call ticket to window |
| POST | `/queue/call-next` | Call next by priority |
| POST | `/queue/tickets/:id/serve` | Start serving |
| POST | `/queue/tickets/:id/complete` | Complete visit |
| POST | `/queue/tickets/:id/no-show` | Mark no-show |
| POST | `/queue/tickets/:id/transfer` | Transfer to another dept |
| GET | `/queue/stats/:dept` | Wait time + volume stats |
| GET | `/queue/departments` | List departments |
| POST | `/queue/departments` | Upsert department config |
| POST | `/queue/departments/seed` | Seed 12 default departments |

### Public Display (no auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/queue/display/:dept` | Public display board |

## Department Defaults (12)
- Emergency (ED), Primary Care (PC), Laboratory (LAB), Radiology (RAD)
- Pharmacy (RX), Dental (DEN), Mental Health (MH), Ophthalmology (EYE)
- Physical Therapy (PT), Surgery Clinic (SURG), Registration (REG), Billing (BILL)

## Ticket Numbering
- Format: `{PREFIX}-{NNN}` (e.g., `ED-001`, `LAB-042`)
- Daily counter per department (resets with API restart or at midnight)
- Prefix configurable per department

## Priority Queue
- 4 levels: urgent → high → normal → low
- `call-next` respects priority ordering, then FIFO within same priority
- Priority can be set at ticket creation

## How to Test

### 1. Seed Departments
```bash
curl -X POST http://localhost:3001/queue/departments/seed -b cookies.txt
```

### 2. Create a Ticket
```bash
curl -X POST http://localhost:3001/queue/tickets \
  -b cookies.txt -H "Content-Type: application/json" \
  -d '{"department":"primary-care","patientDfn":"3","patientName":"PATIENT,TEST"}'
```

### 3. Call Next Patient
```bash
curl -X POST http://localhost:3001/queue/call-next \
  -b cookies.txt -H "Content-Type: application/json" \
  -d '{"department":"primary-care","windowNumber":"Room-1"}'
```

### 4. View Display Board (no auth)
```bash
curl http://localhost:3001/queue/display/primary-care
```

### 5. View Stats
```bash
curl http://localhost:3001/queue/stats/primary-care -b cookies.txt
```

## Store Policy
| Store | Classification | Durability |
|-------|---------------|------------|
| queue-ticket-store | critical | pg_backed |
| queue-event-store | audit | pg_backed |
| queue-department-configs | registry | pg_backed |
| queue-daily-counters | ephemeral | ephemeral |
