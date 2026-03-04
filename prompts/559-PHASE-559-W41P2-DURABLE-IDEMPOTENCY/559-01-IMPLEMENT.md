# Phase 559 (W41-P2): Durable Idempotency Keys

## User Request

Ensure idempotency middleware has full PG write-through with TTL enforcement.

## Implementation Steps

1. Verified existing PG scaffolding: initIdempotencyRepo, upsertKey, findByKey, deleteKey, pruneExpiredKeys
2. Verified 24h TTL enforcement via expiresAt check on every lookup
3. Updated store-policy from in_memory_only to pg_write_through
4. No additional code changes needed - middleware/idempotency.ts already complete

## Files Touched

- apps/api/src/platform/store-policy.ts (middleware-idempotency entry updated)

## Notes

- Already had full PG wiring from Phase 103/174
- Only store-policy classification needed updating
