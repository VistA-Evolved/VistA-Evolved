/**
 * Platform DB -- Retry + Backoff Utility
 *
 * Phase 103: DB Performance Posture
 *
 * Provides idempotent retry logic for Postgres operations.
 * Handles transient errors (connection reset, serialization failure,
 * deadlock) with exponential backoff + jitter.
 *
 * Usage:
 *   const result = await withPgRetry(() => db.select().from(payer), {
 *     maxRetries: 3,
 *     baseDelayMs: 100,
 *   });
 */

/** Transient PG error codes that are safe to retry. */
const RETRYABLE_PG_CODES = new Set([
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '57P01', // admin_shutdown (e.g. pgbouncer restart)
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
]);

export interface PgRetryOptions {
  /** Max retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 100). */
  baseDelayMs?: number;
  /** Max delay cap in ms (default: 5000). */
  maxDelayMs?: number;
  /** Operation label for logging (default: "pg-op"). */
  label?: string;
}

export interface PgRetryResult<T> {
  ok: boolean;
  data?: T;
  attempts: number;
  totalMs: number;
  error?: string;
}

/**
 * Determine if a Postgres error is transient and safe to retry.
 */
function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const pgErr = err as { code?: string; message?: string };

  // Check PG error codes
  if (pgErr.code && RETRYABLE_PG_CODES.has(pgErr.code)) return true;

  // Check common transient error messages
  const msg = pgErr.message?.toLowerCase() ?? '';
  if (msg.includes('connection reset')) return true;
  if (msg.includes('connection terminated')) return true;
  if (msg.includes('econnrefused')) return true;
  if (msg.includes('econnreset')) return true;
  if (msg.includes('etimedout')) return true;
  if (msg.includes('too many clients')) return true;

  return false;
}

/**
 * Execute a PG operation with exponential backoff retry.
 * Only retries on transient errors -- permanent errors fail immediately.
 */
export async function withPgRetry<T>(
  fn: () => Promise<T>,
  opts?: PgRetryOptions
): Promise<PgRetryResult<T>> {
  const maxRetries = opts?.maxRetries ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 100;
  const maxDelayMs = opts?.maxDelayMs ?? 5_000;
  const start = Date.now();

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return {
        ok: true,
        data,
        attempts: attempt,
        totalMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err;

      // Don't retry non-transient errors
      if (!isRetryableError(err)) {
        return {
          ok: false,
          attempts: attempt,
          totalMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // Don't retry if we've exhausted attempts
      if (attempt > maxRetries) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * baseDelayMs,
        maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    ok: false,
    attempts: maxRetries + 1,
    totalMs: Date.now() - start,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

/**
 * Check if an error is a PG unique violation (23505).
 * Useful for idempotent upserts -- if insert conflicts, it's a no-op.
 */
export function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return (err as { code?: string }).code === '23505';
}
