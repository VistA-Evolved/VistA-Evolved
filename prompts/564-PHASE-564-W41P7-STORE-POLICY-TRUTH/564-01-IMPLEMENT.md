# Phase 564 (W41-P7): Store-Policy Truth Pass

## User Request

Update store-policy.ts durability classifications for all W41 PG-wired stores from in_memory_only to pg_write_through.

## Implementation Steps

1. Add "pg_write_through" to DurabilityStatus union type
2. Update 12 store entries to pg_write_through:
   - writeback-commands, writeback-attempts, writeback-results
   - middleware-idempotency
   - hl7-dead-letter-enhanced, hl7-raw-message-vault
   - scheduling-writeback-entries
   - bulk-export-jobs
   - event-bus-outbox, event-bus-dlq, event-bus-delivery-log
   - dsar-requests
3. Update notes on each entry to reference W41 phase and wiring function

## Files Touched

- apps/api/src/platform/store-policy.ts (type update + 12 entry updates)

## Notes

- DurabilityStatus now includes: in_memory_only | pg_backed | sqlite_backed | pg_write_through
- All 12 entries previously classified as in_memory_only
