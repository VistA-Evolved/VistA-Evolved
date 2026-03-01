# ADR: Event Bus Architecture

## Status
Accepted

## Context
VistA-Evolved needs a canonical domain event system so that:
- Internal services can react to state changes (note signed, order placed, claim submitted)
- External integrations (webhooks, FHIR subscriptions) have a single event source
- Events are replayable per tenant for debugging and recovery
- Events are versioned so consumers can handle schema evolution

Options considered:
1. **External message broker** (Kafka, RabbitMQ, NATS) -- powerful but adds infrastructure
2. **In-process pub/sub** (Node.js EventEmitter) -- simple but no persistence or replay
3. **Outbox pattern with in-process bus** -- best of both; persistent + simple

## Decision
- **Outbox pattern with in-process event bus.**
- Events are written to an in-memory outbox (PG table ready for durability).
- A publisher worker drains the outbox and dispatches to registered consumers.
- Dead Letter Queue (DLQ) captures failed deliveries for replay.
- Each event has: `eventId`, `eventType`, `version`, `tenantId`, `subjectRefHash`
  (SHA-256 of the subject identifier -- NO raw PHI), `occurredAt`, `payload` (sanitized).
- Event types are string constants with semantic versioning (e.g., `note.signed.v1`).
- Tenant isolation: consumers only receive events matching their tenant context.
- Replay: admin endpoint replays events from the outbox within a time window.

## Consequences
- No external broker dependency in dev/test mode.
- Events are transient (in-memory) until PG-backed outbox is wired.
- Webhooks and FHIR subscriptions consume from this bus.
- Plugin extensions register as event consumers.
- Future: swap in-process bus for NATS/Kafka adapter when needed.
