# Phase 562 (W41-P5): Verify HL7 Dead-Letter PG

## Verification Steps
1. `tsc --noEmit` — zero TS errors
2. dead-letter-enhanced.ts exports initHl7DlqRepo and rehydrateHl7Dlq
3. lifecycle.ts W41 block imports and wires hl7-dlq
4. persistDlqEntry fires on addEnhancedDeadLetter, resolveDeadLetter, replayDeadLetter
5. store-policy.ts hl7-dead-letter-enhanced and hl7-raw-message-vault entries are pg_write_through
6. hl7_dead_letter table in v58 migration with raw_message column

## Pass Criteria
- Zero TS errors
- Write-through fires on all 3 mutation paths
- Raw message vault rehydrated from PG on startup
