# Phase 159 — Patient Queue / Waiting / Numbering / Calling System

## Overview

Phase 159 provides a department-level patient queue system with auto-numbering,
priority triage (urgent/high/normal/low), calling display boards, and front-desk
management. Integrates with the existing Phase 139 check-in lifecycle.

## Architecture

### Backend (`apps/api/src/queue/`)

| File              | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `types.ts`        | QueueTicket, QueueEvent, DepartmentQueueConfig, QueueDisplayBoard, QueueStats        |
| `queue-engine.ts` | In-memory queue store, priority ordering, daily ticket numbering, department routing |
| `queue-routes.ts` | Fastify REST API plugin (~15 endpoints)                                              |
| `index.ts`        | Barrel export                                                                        |

### Database

- **SQLite**: `queue_ticket`, `queue_event` (auto-created via migrate.ts)
- **PostgreSQL**: Migration v24 (`phase159_patient_queue`) with UUID, TIMESTAMPTZ
- **RLS**: Both tables in `tenantTables` array with `tenant_id` column
- **Phase 592 reality**: queue tickets and queue events are now served PG-first in `queue-routes.ts`; the in-memory engine remains a fallback only when PG is not configured.

### UI

| Page             | Path                |
| ---------------- | ------------------- |
| Queue Management | `/cprs/admin/queue` |

## API Endpoints

### Queue Management (session auth)

| Method | Path                          | Description                 |
| ------ | ----------------------------- | --------------------------- |
| POST   | `/queue/tickets`              | Create ticket               |
| GET    | `/queue/tickets?dept=X`       | List active tickets         |
| GET    | `/queue/tickets/:id`          | Get single ticket           |
| GET    | `/queue/tickets/:id/events`   | Get ticket events           |
| POST   | `/queue/tickets/:id/call`     | Call ticket to window       |
| POST   | `/queue/call-next`            | Call next by priority       |
| POST   | `/queue/tickets/:id/serve`    | Start serving               |
| POST   | `/queue/tickets/:id/complete` | Complete visit              |
| POST   | `/queue/tickets/:id/no-show`  | Mark no-show                |
| POST   | `/queue/tickets/:id/transfer` | Transfer to another dept    |
| GET    | `/queue/stats/:dept`          | Wait time + volume stats    |
| GET    | `/queue/departments`          | List departments            |
| POST   | `/queue/departments`          | Upsert department config    |
| POST   | `/queue/departments/seed`     | Seed 12 default departments |

### Public Display (no auth)

| Method | Path                   | Description          |
| ------ | ---------------------- | -------------------- |
| GET    | `/queue/display/:dept` | Public display board |

## Department Defaults (12)

- Emergency (ED), Primary Care (PC), Laboratory (LAB), Radiology (RAD)
- Pharmacy (RX), Dental (DEN), Mental Health (MH), Ophthalmology (EYE)
- Physical Therapy (PT), Surgery Clinic (SURG), Registration (REG), Billing (BILL)

## Ticket Numbering

- Format: `{PREFIX}-{NNN}` (e.g., `ED-001`, `LAB-042`)
- Daily counter per department derived from durable ticket count for the current day
- Prefix configurable per department

## Priority Queue

- 4 levels: urgent → high → normal → low
- `call-next` respects priority ordering, then FIFO within same priority
- Priority can be set at ticket creation

## How to Test

### 1. Login and capture CSRF

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{ accessCode = 'PRO1234'; verifyCode = 'PRO1234!!' } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
$csrf = $login.csrfToken
$headers = @{ 'X-CSRF-Token' = $csrf }
```

### 2. Seed Departments

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/departments/seed' -Method Post -Headers $headers -WebSession $session
```

### 3. Create a Ticket

```powershell
$createBody = @{ department = 'primary-care'; patientDfn = '46'; patientName = 'PROGRAMMER,ONE'; priority = 'high' } | ConvertTo-Json -Compress
$create = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/tickets' -Method Post -Body $createBody -ContentType 'application/json' -Headers $headers -WebSession $session
```

### 4. Call, Serve, and Complete

```powershell
$callNextBody = @{ department = 'primary-care'; windowNumber = 'Room-1' } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/call-next' -Method Post -Body $callNextBody -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/queue/tickets/{0}/serve" -f $create.ticket.id) -Method Post -Body (@{ providerDuz = '1' } | ConvertTo-Json -Compress) -ContentType 'application/json' -Headers $headers -WebSession $session
Invoke-RestMethod -Uri ("http://127.0.0.1:3001/queue/tickets/{0}/complete" -f $create.ticket.id) -Method Post -Headers $headers -WebSession $session
```

### 5. View Display Board (no auth)

```powershell
curl.exe -s http://127.0.0.1:3001/queue/display/primary-care
```

### 6. Prove Persistence Across Restart

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/queue/tickets?dept=primary-care' -Method Get -WebSession $session
```

## Store Policy

| Store                    | Classification | Durability |
| ------------------------ | -------------- | ---------- |
| queue-ticket-store       | critical       | pg_backed  |
| queue-event-store        | audit          | pg_backed  |
| queue-department-configs | registry       | pg_backed  |
| queue-daily-counters     | ephemeral      | ephemeral  |

## Phase 592 Notes

- The admin queue page now includes an explicit front-desk ticket creation flow instead of assuming an external hidden creator.
- `/queue/departments` auto-seeds the default department catalog when a tenant has no in-memory config yet, so the page no longer opens into an empty setup state.
- `/queue/display/:dept` is bypassed in module guard so the public board contract is truthful again.
