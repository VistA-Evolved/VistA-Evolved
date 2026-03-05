# Phase 574 — W42-P3: Redis Distributed State

> Wave 42: Production Remediation | Position 3 of 15
> Depends on: None (parallel with Phase 573)

## Objective

Wire Redis for distributed state: session caching, rate limiting,
distributed locks, and pub/sub. Graceful fallback to in-memory when
Redis is unavailable (single-instance dev).

## Files Created

- `apps/api/src/lib/redis.ts` — Centralized Redis client using `ioredis`

## Dependencies Added

- `ioredis ^5.10.0` in apps/api/package.json

## API Surface

- `initRedis()` — Connect at startup; returns false if REDIS_URL not set
- `isRedisAvailable()` — Health check
- `checkRateLimit(key, limit, windowMs)` — Sliding window via INCR+TTL
- `acquireLock(key, ttlMs)` — SETNX-based distributed lock
- `cacheSession(hash, json, ttl)` / `getCachedSession(hash)` — Session cache
- `subscribe(channel, handler)` / `publish(channel, msg)` — Pub/Sub
- `disconnectRedis()` — Graceful shutdown

## Env Vars

| Var | Default | Description |
| --- | --- | --- |
| `REDIS_URL` | (empty) | Redis connection URL. If empty, Redis is disabled. |
| `REDIS_KEY_PREFIX` | `ve:` | Key prefix for namespace isolation |

## Acceptance Criteria

- [ ] `ioredis` in package.json dependencies
- [ ] `redis.ts` exports all 9 functions listed above
- [ ] All functions gracefully return no-op/fallback when Redis unavailable
- [ ] Rate limiter uses INCR + TTL atomic pipeline
- [ ] Lock uses SET NX EX with random value for safe release
- [ ] Pub/Sub uses dedicated subscriber connection (required by Redis)
