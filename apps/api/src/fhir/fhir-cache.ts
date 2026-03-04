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
const FHIR_CACHE_ENABLED = process.env.FHIR_CACHE_ENABLED !== 'false'; // default on

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

  // onRequest: check If-None-Match and serve 304 / cached response
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.method !== 'GET') return;
    if (!request.url.startsWith('/fhir/')) return;

    const cacheKey = buildCacheKey(request);
    const entry = cache.get(cacheKey);

    if (!entry) return;

    // Check TTL
    if (Date.now() - entry.createdAt > FHIR_CACHE_TTL_MS) {
      cache.delete(cacheKey);
      return;
    }

    // Always set ETag header for cached entries
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === entry.etag) {
      // 304 Not Modified
      reply
        .status(304)
        .header('etag', entry.etag)
        .header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`)
        .send();
      return;
    }

    // Serve cached response with ETag
    reply
      .status(entry.statusCode)
      .header('content-type', entry.contentType)
      .header('etag', entry.etag)
      .header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`)
      .header('x-fhir-cache', 'HIT')
      .send(entry.body);
  });

  // onSend: cache successful FHIR responses and add ETag
  server.addHook(
    'onSend',
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      if (request.method !== 'GET') return payload;
      if (!request.url.startsWith('/fhir/')) return payload;
      if (reply.statusCode !== 200) return payload;

      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (!body) return payload;

      const etag = computeEtag(body);
      reply.header('etag', etag);
      reply.header('cache-control', `private, max-age=${Math.floor(FHIR_CACHE_TTL_MS / 1000)}`);
      reply.header('x-fhir-cache', 'MISS');

      // Store in cache
      const cacheKey = buildCacheKey(request);

      // Evict if at capacity
      if (cache.size >= FHIR_CACHE_MAX_ENTRIES) {
        evictExpired();
        // If still at capacity after eviction, drop oldest
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
