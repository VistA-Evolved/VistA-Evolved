/**
 * Correlated Fetch — Phase 77.
 *
 * Wraps the native `fetch()` to:
 *   1. Generate a unique `X-Request-Id` per request (or accept a caller-supplied one)
 *   2. Always send `credentials: 'include'` (httpOnly cookie auth — AGENTS.md #20)
 *   3. Surface the server-assigned correlation ID from the response
 *
 * Usage:
 *   import { correlatedFetch, correlatedGet } from '../lib/fetch-with-correlation';
 *   const res = await correlatedFetch('/vista/allergies?dfn=3');
 *   console.log(res.correlationId); // from X-Request-Id response header
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/* Correlation ID generator                                            */
/* ------------------------------------------------------------------ */

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ------------------------------------------------------------------ */
/* Correlated fetch                                                    */
/* ------------------------------------------------------------------ */

export interface CorrelatedResponse<T = unknown> {
  /** Parsed JSON body */
  data: T;
  /** Server-assigned correlation ID from X-Request-Id header */
  correlationId: string | null;
  /** Server-assigned OTel trace ID from X-Trace-Id header */
  traceId: string | null;
  /** HTTP status code */
  status: number;
  /** Whether the response was ok (2xx) */
  ok: boolean;
}

/**
 * Fetch with automatic correlation ID injection.
 * Merges the correlation header with any caller-supplied headers.
 */
export async function correlatedFetch<T = unknown>(
  path: string,
  opts?: RequestInit & { correlationId?: string },
): Promise<CorrelatedResponse<T>> {
  const correlationId = opts?.correlationId ?? generateCorrelationId();

  const headers = new Headers(opts?.headers);
  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', correlationId);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    credentials: 'include',
    ...opts,
    headers,
  });

  const serverCorrelationId = res.headers.get('X-Request-Id');
  const traceId = res.headers.get('X-Trace-Id');

  if (!res.ok) {
    throw new CorrelatedError(
      `API ${res.status}: ${res.statusText}`,
      res.status,
      serverCorrelationId ?? correlationId,
      traceId,
    );
  }

  const data = (await res.json()) as T;

  return {
    data,
    correlationId: serverCorrelationId ?? correlationId,
    traceId,
    status: res.status,
    ok: true,
  };
}

/**
 * Convenience GET with correlation — returns just the parsed body.
 * Backward-compatible with existing `get<T>(path)` pattern.
 */
export async function correlatedGet<T>(path: string): Promise<T> {
  const { data } = await correlatedFetch<T>(path);
  return data;
}

/**
 * Convenience POST with correlation.
 */
export async function correlatedPost<T>(
  path: string,
  body: unknown,
): Promise<CorrelatedResponse<T>> {
  return correlatedFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------------ */
/* Error class with correlation context                                */
/* ------------------------------------------------------------------ */

export class CorrelatedError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly correlationId: string,
    public readonly traceId: string | null,
  ) {
    super(message);
    this.name = 'CorrelatedError';
  }
}
