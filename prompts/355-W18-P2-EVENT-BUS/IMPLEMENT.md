# Phase 355 — W18-P2: Canonical Domain Event Bus

## IMPLEMENT

- Event schema: eventId, eventType, version, tenantId, subjectRefHash, occurredAt, payload
- Outbox publisher worker with retry + DLQ + replay
- Consumer registration contract
- 5 event types: tenant.created, note.signed, order.placed, lab.result.posted, claim.submitted
- PG migration v44 for event_bus_outbox + event_bus_dlq tables
- Routes: /events/health, /events/outbox, /events/replay, /events/dlq, /events/types

## Files

- apps/api/src/services/event-bus.ts
- apps/api/src/routes/event-bus-routes.ts
