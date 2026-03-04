# OR Scheduling — Runbook

## Overview

Phase 467. REST API for OR case management, anesthesia tracking, room/block scheduling.

## Endpoints

| Method | Path                     | Purpose                                |
| ------ | ------------------------ | -------------------------------------- |
| POST   | /or/cases                | Schedule new OR case                   |
| GET    | /or/cases                | List cases (?date, ?status, ?roomId)   |
| GET    | /or/cases/:id            | Get single case                        |
| PATCH  | /or/cases/:id/status     | Update case status (milestone tracked) |
| POST   | /or/cases/:id/anesthesia | Set/update anesthesia record           |
| GET    | /or/rooms                | List OR rooms                          |
| GET    | /or/rooms/:id            | Get single room                        |
| PATCH  | /or/rooms/:id/status     | Update room status                     |
| GET    | /or/blocks               | List block schedule (?roomId)          |
| POST   | /or/blocks               | Create block reservation               |
| GET    | /or/board                | OR board metrics                       |

## Case Workflow

1. Schedule case -> POST /or/cases (status: scheduled)
2. Pre-op -> PATCH status to pre-op, in-holding
3. Patient in OR -> PATCH status to in-or (room goes in-use)
4. Anesthesia -> POST /or/cases/:id/anesthesia, PATCH status to under-anesthesia
5. Procedure -> PATCH through procedure-start, procedure-end, closing
6. Recovery -> PATCH to in-pacu (room goes to turnover)
7. Complete -> PATCH to completed/recovered

## Store

In-memory. 6 default rooms (4 Main OR, 2 Ambulatory). Resets on restart.
