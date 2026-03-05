/**
 * Redis Client — Phase 574 (Wave 42)
 *
 * Centralized Redis client for distributed state:
 *   - Session cache (replaces in-memory LRU)
 *   - Rate limiting (replaces per-instance Maps)
 *   - Distributed locks (replaces in-memory booking locks)
 *   - Pub/Sub (cross-instance event broadcast)
 *
 * Graceful fallback: if REDIS_URL is not configured or Redis is
 * unreachable, all operations degrade to no-ops with logged warnings.
 * This allows single-instance dev to work without Redis.
 */

import Redis from 'ioredis';
import { log } from './logger.js';

let client: Redis | null = null;
let subClient: Redis | null = null;
let connected = false;

const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 've:';

/** Initialize Redis clients. Call once at startup. */
export function initRedis(): boolean {
  if (!REDIS_URL) {
    log.warn('REDIS_URL not configured — Redis disabled, using in-memory fallback');
    return false;
  }

  try {
    client = new Redis(REDIS_URL, {
      keyPrefix: REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
      lazyConnect: true,
    });

    client.on('connect', () => {
      connected = true;
      log.info('Redis connected');
    });
    client.on('error', (err) => {
      log.warn('Redis error', { error: err.message });
    });
    client.on('close', () => {
      connected = false;
      log.warn('Redis connection closed');
    });

    client.connect().catch((err) => {
      log.warn('Redis initial connect failed — operating without Redis', { error: err.message });
    });

    return true;
  } catch (err: any) {
    log.warn('Redis init failed', { error: err.message });
    return false;
  }
}

/** Get the Redis client (null if not configured). */
export function getRedisClient(): Redis | null {
  return client;
}

/** Check if Redis is connected and available. */
export function isRedisAvailable(): boolean {
  return connected && client !== null;
}

/* ------------------------------------------------------------------ */
/* Rate Limiting                                                        */
/* ------------------------------------------------------------------ */

/**
 * Sliding-window rate limiter using Redis INCR + TTL.
 * Returns { allowed, remaining, resetMs }.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (!client || !connected) {
    return { allowed: true, remaining: limit, resetMs: 0 };
  }

  try {
    const fullKey = `rl:${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const multi = client.multi();
    multi.incr(fullKey);
    multi.ttl(fullKey);
    const results = await multi.exec();

    if (!results) return { allowed: true, remaining: limit, resetMs: 0 };

    const count = (results[0]?.[1] as number) || 0;
    const ttl = (results[1]?.[1] as number) || -1;

    if (ttl === -1) {
      await client.expire(fullKey, windowSec);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetMs = ttl > 0 ? ttl * 1000 : windowMs;

    return { allowed, remaining, resetMs };
  } catch (err: any) {
    log.warn('Redis rate limit check failed, allowing', { error: err.message });
    return { allowed: true, remaining: limit, resetMs: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Distributed Locks                                                    */
/* ------------------------------------------------------------------ */

/**
 * Acquire a distributed lock using SET NX EX.
 * Returns a release function, or null if lock not acquired.
 */
export async function acquireLock(
  lockKey: string,
  ttlMs: number = 30_000,
): Promise<(() => Promise<void>) | null> {
  if (!client || !connected) return null;

  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fullKey = `lock:${lockKey}`;
  const ttlSec = Math.ceil(ttlMs / 1000);

  try {
    const result = await client.set(fullKey, lockValue, 'EX', ttlSec, 'NX');
    if (result !== 'OK') return null;

    return async () => {
      try {
        const current = await client!.get(fullKey);
        if (current === lockValue) {
          await client!.del(fullKey);
        }
      } catch { /* best effort release */ }
    };
  } catch (err: any) {
    log.warn('Redis lock acquire failed', { error: err.message });
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Session Cache                                                        */
/* ------------------------------------------------------------------ */

/**
 * Cache a session in Redis with TTL.
 */
export async function cacheSession(
  tokenHash: string,
  sessionJson: string,
  ttlMs: number = 60_000,
): Promise<void> {
  if (!client || !connected) return;
  try {
    await client.setex(`sess:${tokenHash}`, Math.ceil(ttlMs / 1000), sessionJson);
  } catch (err: any) {
    log.warn('Redis session cache write failed', { error: err.message });
  }
}

/**
 * Get a cached session from Redis.
 */
export async function getCachedSession(tokenHash: string): Promise<string | null> {
  if (!client || !connected) return null;
  try {
    return await client.get(`sess:${tokenHash}`);
  } catch (err: any) {
    log.warn('Redis session cache read failed', { error: err.message });
    return null;
  }
}

/**
 * Invalidate a cached session in Redis.
 */
export async function invalidateCachedSession(tokenHash: string): Promise<void> {
  if (!client || !connected) return;
  try {
    await client.del(`sess:${tokenHash}`);
  } catch { /* best effort */ }
}

/* ------------------------------------------------------------------ */
/* Pub/Sub                                                              */
/* ------------------------------------------------------------------ */

type MessageHandler = (channel: string, message: string) => void;
const subscriptions = new Map<string, Set<MessageHandler>>();

function ensureSubClient(): Redis | null {
  if (!REDIS_URL) return null;
  if (!subClient) {
    subClient = new Redis(REDIS_URL, {
      keyPrefix: REDIS_KEY_PREFIX,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    subClient.on('message', (channel: string, message: string) => {
      const handlers = subscriptions.get(channel);
      if (handlers) {
        for (const handler of handlers) {
          try { handler(channel, message); } catch { /* handler error */ }
        }
      }
    });
    subClient.connect().catch(() => {});
  }
  return subClient;
}

/**
 * Subscribe to a Redis pub/sub channel.
 */
export async function subscribe(
  channel: string,
  handler: MessageHandler,
): Promise<void> {
  const sub = ensureSubClient();
  if (!sub) return;

  if (!subscriptions.has(channel)) {
    subscriptions.set(channel, new Set());
    try {
      await sub.subscribe(channel);
    } catch (err: any) {
      log.warn('Redis subscribe failed', { channel, error: err.message });
    }
  }
  subscriptions.get(channel)!.add(handler);
}

/**
 * Publish a message to a Redis pub/sub channel.
 */
export async function publish(channel: string, message: string): Promise<void> {
  if (!client || !connected) return;
  try {
    await client.publish(channel, message);
  } catch (err: any) {
    log.warn('Redis publish failed', { channel, error: err.message });
  }
}

/* ------------------------------------------------------------------ */
/* Shutdown                                                             */
/* ------------------------------------------------------------------ */

/** Gracefully disconnect Redis clients. */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    try { await client.quit(); } catch { client.disconnect(); }
    client = null;
  }
  if (subClient) {
    try { await subClient.quit(); } catch { subClient.disconnect(); }
    subClient = null;
  }
  connected = false;
  subscriptions.clear();
  log.info('Redis disconnected');
}
