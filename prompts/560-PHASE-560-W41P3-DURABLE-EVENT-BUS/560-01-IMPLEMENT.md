# Phase 560 (W41-P3): Durable Event Bus Outbox

## User Request
Wire event-bus.ts (outbox, DLQ, delivery log) to PG for restart-safe event persistence.

## Implementation Steps
1. Add logger import to event-bus.ts
2. Create EventBusRepo interface
3. Add _outboxRepo, _dlqRepo, _deliveryLogRepo lazy variables
4. Implement initEventBusRepos() for lifecycle.ts wiring
5. Implement rehydrateEventBus(tenantId)
6. Implement persistOutboxEvent(), persistDlqEntry(), persistDeliveryLog()
7. Wire persist into publishEvent(), dispatchEvent() delivery log, addToDlq()
8. Wire in lifecycle.ts W41 block

## Files Touched
- apps/api/src/services/event-bus.ts (PG wiring + persist calls)
- apps/api/src/server/lifecycle.ts (W41 wiring block)
- apps/api/src/platform/store-policy.ts (3 entries updated)

## Notes
- PG tables event_bus_outbox, event_bus_dlq, event_bus_delivery_log already exist (v44)
- Consumer registrations are runtime-only, not persisted (they re-register on module load)
