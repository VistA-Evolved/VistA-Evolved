# Phase 559 (W41-P2): Verification

## Verification Steps

1. middleware/idempotency.ts exports initIdempotencyRepo
2. PG upsert/findByKey/deleteKey/pruneExpiredKeys all wired
3. store-policy: middleware-idempotency = pg_write_through

## Acceptance Criteria

- idempotency middleware already has PG wiring (no new code needed)
- store-policy entry updated
- 24h TTL enforced via expiresAt column
