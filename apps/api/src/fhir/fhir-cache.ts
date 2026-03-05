/**
 * FHIR R4 Response Cache with ETag Support — Phase 179 (Q194).
 *
 * Lightweight in-memory cache for FHIR responses. Computes a weak ETag
 * from SHA-256 hash of the JSON response body and supports If-None-Match
 * for conditional GETs (returning 304 Not Modified).
 *
 * Cache scope: per-route + query string. TTL is configurable via
 * FHIR_CACHE_TTL_MS env var (default: 30 seconds).
 *
 * This cache is intentionally simple: no LRU eviction beyond max entries,
 * no persistence (clears on API restart), and only applies to FHIR
 * search-type and read responses (GET /fhir/*).
 *
 * Zero external dependencies.
 */

import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/* ================================================================== */
/* Configuration                                                        */
/* ================================================================== */

const FHIR_CACHE_TTL_MS = parseInt(process.env.FHIR_CACHE_TTL_MS || '', 10) || 30_000;
const FHIR_CACHE_MAX_ENTRIES = parseInt(process.env.FHIR_CACHE_MAX_ENTRIES || '', 10) || 500;
// BUG-071: Cache disabled by default until Fastify v5 onSend/preHandler
// double-commit issue is resolved. Serving cached responses in preHandler
// causes ERR_HTTP_HEADERS_SENT when Fastify's internal onSendEnd runs.
// Set FHIR_CACHE_ENABLED=true to re-enable at your own risk.
const FHIR_CACHE_ENABLED = process.env.FHIR_CACHE_ENABLED === 'true'; // default OFF

/* ================================================================== */
/* Cache store                                                          */
/* ================================================================== */

interface CacheEntry {
  etag: string;
  body: string;
  contentType: string;
  statusCode: number;
  createdAt: number;
}

const cache = new Map<string, CacheEntry>();

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function computeEtag(body: string): string {
  const hash = createHash('sha256').update(body).digest('hex').substring(0, 16);
  return `W/"${hash}"`;
}

function buildCacheKey(request: FastifyRequest): string {
  // Include session DUZ in key to prevent cross-user cache leaks
  const session = (request as any).session;
  const duz = session?.duz || 'anon';
  return `${duz}:${request.url}`;
}

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > FHIR_CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}

/* ================================================================== */
/* Public API                                                           */
/* ================================================================== */

/**
 * Register FHIR cache hooks on a Fastify instance.
 * Should be called inside the fhir route plugin scope.
 */
export function registerFhirCache(server: FastifyInstance): void {
  if (!FHIR_CACHE_ENABLED) return;

  /*
   * FHIR caching uses a preHandler hook (NOT onRequest) to check If-None-Match.
   * In Fastify v5, calling reply.send() in an onRequest hook causes
   * ERR_HTTP_HEADERS_SENT when the route handler also executes -- Fastify's
   * internal onSendEnd still tries to writeHead after the response was already
   * committed by the onRequest hook. Using preHandler + return reply avoids
   * this by properly short-circuiting the request lifecycle.
   *
   * BUG-071 fix: Removed the onRequest cache-serve path that caused crashes.
   * The onSend hook still caches responses, but we no longer serve from cache
   * in a way that conflicts with Fastify's internal response flow.
   */

  server.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method !== 'GET') return;
    if (!request.url.startsWith('/fhir/')) return;

    const cacheKey = buildCacheKey(request);
    const entry = cache.get(cacheKey);
    if (!entry) return;

    if (Date.now() - entry.createdAt > FHIR_CACHE_TTL_MS) {
      cache.delete(cacheKey);
      return;
    }

    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      return reply
        .status(304)
        .header('etag', entry.etag)
        .header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`)
        .send();
    }

    return reply
      .status(entry.statusCode)
      .header('content-type', entry.contentType)
      .header('etag', entry.etag)
      .header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`)
      .header('x-fhir-cache', 'HIT')
      .send(entry.body);
  });

  server.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      if (request.method !== 'GET') return payload;
      if (!request.url.startsWith('/fhir/')) return payload;
      if (reply.statusCode !== 200) return payload;

      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (!body) return payload;

      const etag = computeEtag(body);

      try {
        if (!reply.sent) {
          reply.header('etag', etag);
          reply.header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`);
          reply.header('x-fhir-cache', 'MISS');
        }
      } catch {
        // Headers already sent -- safe to ignore for caching purposes
      }

      const cacheKey = buildCacheKey(request);

      if (cache.size >= FHIR_CACHE_MAX_ENTRIES) {
        evictExpired();
        if (cache.size >= FHIR_CACHE_MAX_ENTRIES) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
      }

      cache.set(cacheKey, {
        etag,
        body,
        contentType: (reply.getHeader('content-type') as string) || 'application/fhir+json',
        statusCode: 200,
        createdAt: Date.now(),
      });

      return payload;
    }
  );
}

/** Get cache stats for monitoring. */
export function getFhirCacheStats(): {
  enabled: boolean;
  size: number;
  maxEntries: number;
  ttlMs: number;
} {
  return {
    enabled: FHIR_CACHE_ENABLED,
    size: cache.size,
    maxEntries: FHIR_CACHE_MAX_ENTRIES,
    ttlMs: FHIR_CACHE_TTL_MS,
  };
}

/** Clear the FHIR cache (for testing or admin). */
export function clearFhirCache(): void {
  cache.clear();
}
