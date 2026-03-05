# Phase 574 — Notes

## Why This Phase Exists

Redis was defined in Docker Compose and Helm charts but never wired in code.
Seven in-memory rate limiter Maps and multiple lock mechanisms exist that
prevent horizontal scaling. This phase provides the foundation.

## Decisions

- **ioredis over node-redis**: ioredis has better cluster support, built-in
  retry strategies, and is the standard choice in the Node.js ecosystem.
- **Graceful degradation**: All functions return no-op/fallback values when
  Redis is unavailable. This means single-instance dev works without Redis.
- **Separate sub client**: Redis pub/sub requires a dedicated connection in
  subscriber mode. Created lazily on first subscribe call.
- **Key prefix `ve:`**: Prevents collisions if Redis is shared across services.

## Deferred

- Wiring rate limiters in security.ts to use `checkRateLimit` (Phase 585)
- Wiring session cache in session-store.ts to use `cacheSession` (Phase 576)
- Adding Redis to docker-compose.prod.yml (Phase 585)
