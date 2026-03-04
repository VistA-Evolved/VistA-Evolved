# Phase 562 (W41-P5): HL7 Dead-Letter PG

## User Request

Wire dead-letter-enhanced.ts HL7 DLQ + raw message vault to PG for restart-safe dead-letter management.

## Implementation Steps

1. Create Hl7DlqRepo interface
2. Add \_dlqRepo lazy variable
3. Implement initHl7DlqRepo() and rehydrateHl7Dlq()
4. Implement persistDlqEntry() fire-and-forget helper
5. Wire persist into addEnhancedDeadLetter(), resolveDeadLetter(), replayDeadLetter()
6. Raw messages stored in hl7_dead_letter.raw_message column
7. Wire in lifecycle.ts W41 block
8. Created hl7_dead_letter PG table in v58 migration

## Files Touched

- apps/api/src/hl7/dead-letter-enhanced.ts (PG wiring + persist calls)
- apps/api/src/platform/pg/pg-migrate.ts (v58 migration)
- apps/api/src/server/lifecycle.ts (W41 wiring block)
- apps/api/src/platform/store-policy.ts (2 entries updated)

## Notes

- Raw messages rehydrated back into rawMessageVault Map on startup
- hl7_dead_letter PG table includes raw_message, status, retry_count columns
