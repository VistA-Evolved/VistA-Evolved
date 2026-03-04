# Phase 259 -- NOTES -- HL7v2 Message Pipeline

## Key Decisions

- Message events use hash-chained ring buffer (same pattern as imaging-audit.ts, rcm-audit.ts)
- Raw HL7 messages NEVER stored in event store -- only SHA-256 hash + byte size
- DLQ enhanced with raw message vault (separate from event store) to enable replay
- 6 HL7 stores registered in store-policy.ts (3 new P259, 3 existing P240/P258)

## Files Changed

| File                                          | Action                           |
| --------------------------------------------- | -------------------------------- |
| `apps/api/src/hl7/message-event-store.ts`     | NEW                              |
| `apps/api/src/hl7/dead-letter-enhanced.ts`    | NEW                              |
| `apps/api/src/routes/hl7-pipeline.ts`         | NEW                              |
| `apps/api/src/platform/store-policy.ts`       | MODIFIED (6 store entries added) |
| `apps/api/tests/hl7-message-pipeline.test.ts` | NEW                              |
