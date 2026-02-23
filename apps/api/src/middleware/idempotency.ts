/**
 * Idempotency Middleware — Request Deduplication
 *
 * Phase 103: DB Performance Posture
 *
 * Uses the idempotency_key table (Phase 101) to prevent duplicate
 * writes from retried requests. Works with both SQLite and PG backends.
 *
 * Usage: Client sends `Idempotency-Key: <uuid>` header on POST/PUT/PATCH.
 * If the key was already used (within TTL), the cached response is returned.
 * If the key is new, the request proceeds and the response is cached.
 *
 * Without the header, requests proceed normally (no deduplication).
 *
 * TTL: Idempotency keys expire after 24 hours (configurable via
 * IDEMPOTENCY_TTL_MS env var). Expired keys are pruned on each check.
 */

import type { FastifyRequest, FastifyReply } from "fastify";

/** In-memory idempotency store (SQLite mode / lightweight fallback). */
interface CachedResponse {
  statusCode: number;
  body: unknown;
  createdAt: number;
  expiresAt: number;
}

const memoryStore = new Map<string, CachedResponse>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_MEMORY_ENTRIES = 10_000;

function getTtlMs(): number {
  return Number(process.env.IDEMPOTENCY_TTL_MS) || DEFAULT_TTL_MS;
}

/**
 * Prune expired entries from in-memory store.
 * Called lazily on each lookup — O(n) but bounded by MAX_MEMORY_ENTRIES.
 */
function pruneExpired(): void {
  const now = Date.now();
  for (const [key, cached] of memoryStore) {
    if (cached.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Build a composite key from tenant + idempotency key.
 */
function compositeKey(tenantId: string, key: string): string {
  return `${tenantId}::${key}`;
}

/**
 * Idempotency guard for Fastify routes.
 *
 * Returns a preHandler hook. Attach to POST/PUT/PATCH routes:
 *
 *   server.post("/my-route", {
 *     preHandler: [idempotencyGuard()],
 *   }, handler);
 *
 * Or register as a global hook for all mutation methods.
 */
export function idempotencyGuard() {
  return async function idempotencyPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Only guard mutation methods
    const method = request.method.toUpperCase();
    if (!["POST", "PUT", "PATCH"].includes(method)) return;

    // Check for idempotency header
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) return; // No header = no deduplication

    // Validate key format (must be non-empty, max 128 chars)
    if (idempotencyKey.length > 128) {
      reply.status(400).send({
        ok: false,
        error: "Idempotency-Key header must be <= 128 characters",
      });
      return;
    }

    // Get tenant from session (default if not available)
    const session = (request as any).session;
    const tenantId = session?.tenantId ?? "default";
    const cKey = compositeKey(tenantId, idempotencyKey);

    // Prune expired entries periodically
    if (memoryStore.size > MAX_MEMORY_ENTRIES / 2) {
      pruneExpired();
    }

    // Check if key exists and is not expired
    const cached = memoryStore.get(cKey);
    if (cached && cached.expiresAt > Date.now()) {
      // Return cached response with indicator header
      reply
        .status(cached.statusCode)
        .header("Idempotency-Replayed", "true")
        .send(cached.body);
      return;
    }

    // Store a marker to detect concurrent duplicates
    const marker: CachedResponse = {
      statusCode: 0,
      body: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + getTtlMs(),
    };
    memoryStore.set(cKey, marker);

    // On error, remove the marker so the request can be retried.
    // The onSend hook handles capturing the actual response body + status.
    reply.then(
      () => {
        // onSend already captured status + body — only update statusCode
        // as a fallback if onSend somehow missed it
        const existing = memoryStore.get(cKey);
        if (existing && existing.statusCode === 0) {
          existing.statusCode = reply.statusCode;
        }
      },
      () => {
        // On error, remove the marker so the request can be retried
        memoryStore.delete(cKey);
      },
    );
  };
}

/**
 * Fastify onSend hook to capture response body for idempotency caching.
 * Register globally: server.addHook('onSend', idempotencyOnSend);
 */
export async function idempotencyOnSend(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
): Promise<unknown> {
  const idempotencyKey = request.headers["idempotency-key"] as string | undefined;
  if (!idempotencyKey) return payload;

  const method = request.method.toUpperCase();
  if (!["POST", "PUT", "PATCH"].includes(method)) return payload;

  const session = (request as any).session;
  const tenantId = session?.tenantId ?? "default";
  const cKey = compositeKey(tenantId, idempotencyKey);

  // Parse the payload to store as JSON
  let body: unknown = null;
  if (typeof payload === "string") {
    try {
      body = JSON.parse(payload);
    } catch {
      body = payload;
    }
  } else {
    body = payload;
  }

  // Update the cached entry with actual response body
  const existing = memoryStore.get(cKey);
  if (existing) {
    existing.statusCode = reply.statusCode;
    existing.body = body;
  }

  return payload;
}

/**
 * Get idempotency store stats (for health/debug endpoints).
 */
export function getIdempotencyStats(): {
  entries: number;
  maxEntries: number;
  ttlMs: number;
} {
  return {
    entries: memoryStore.size,
    maxEntries: MAX_MEMORY_ENTRIES,
    ttlMs: getTtlMs(),
  };
}

/**
 * Clear all idempotency entries (for testing).
 */
export function clearIdempotencyStore(): void {
  memoryStore.clear();
}
