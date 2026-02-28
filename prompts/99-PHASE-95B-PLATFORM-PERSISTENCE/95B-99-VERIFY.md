# Phase 95B -- Verify: Platform Persistence

## Verification Steps

1. Verify SQLite platform DB initializes correctly in dev mode
2. Confirm PG backend activates when PLATFORM_PG_URL is set
3. Check store-resolver correctly routes to SQLite vs PG based on config
4. Verify idempotency table and session table operations
5. Run store-policy gate to confirm all stores are categorized

## Acceptance Criteria
- [ ] `initPlatformDb()` creates `data/platform.db` in dev mode
- [ ] PG migrations run successfully when PG URL is configured
- [ ] Store resolver returns correct backend based on STORE_BACKEND env var
- [ ] All in-memory stores registered in store-policy.ts
