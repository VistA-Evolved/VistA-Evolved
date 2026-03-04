# ED Whiteboard — Runbook

## Overview

Phase 465. REST API for Emergency Department patient tracking board.

## Endpoints

| Method | Path                       | Purpose                                          |
| ------ | -------------------------- | ------------------------------------------------ |
| POST   | /ed/visits                 | Register new ED visit                            |
| GET    | /ed/visits                 | List visits (optional `?status=`)                |
| GET    | /ed/visits/:id             | Get single visit                                 |
| PATCH  | /ed/visits/:id/status      | Update visit status                              |
| POST   | /ed/visits/:id/triage      | Record triage assessment                         |
| GET    | /ed/beds                   | List all ED beds                                 |
| POST   | /ed/visits/:id/assign-bed  | Assign patient to bed                            |
| POST   | /ed/visits/:id/release-bed | Release bed                                      |
| POST   | /ed/visits/:id/disposition | Record final disposition                         |
| GET    | /ed/board                  | Board metrics (counts, avg wait, LOS, LWBS rate) |

## ED Workflow

1. Patient arrives -> POST /ed/visits (status: waiting)
2. Triage nurse assesses -> POST /ed/visits/:id/triage (status: triaged)
3. Bed available -> POST /ed/visits/:id/assign-bed (status: bedded)
4. Treatment progresses -> PATCH status to in-treatment, pending-results, etc.
5. Disposition decided -> POST /ed/visits/:id/disposition (final status)

## Store

In-memory. Resets on API restart. 26 default beds across 4 zones (trauma, acute, fast-track, hallway).
