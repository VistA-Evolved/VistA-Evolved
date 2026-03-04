# Phase 560 (W41-P3): Verification

## Verification Steps

1. event-bus.ts exports initEventBusRepos, rehydrateEventBus
2. publishEvent calls persistOutboxEvent
3. dispatchEvent delivery log calls persistDeliveryLog
4. addToDlq calls persistDlqEntry
5. store-policy: event-bus-outbox/dlq/delivery-log = pg_write_through

## Acceptance Criteria

- Zero TS errors
- All 3 event bus stores wired to PG
- Rehydration loads from PG on startup
