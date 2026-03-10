/**
 * CSRF Token Utility -- Phase 29 (migrated to synchronizer token Phase 132)
 *
 * Synchronizer token pattern for CSRF protection on portal write actions.
 *
 * Flow:
 * 1. GET /portal/iam/csrf-token -- returns { csrfToken } from server-side session
 * 2. Client stores token in JS state (NOT a cookie)
 * 3. Client includes X-CSRF-Token header on all POST/PUT/DELETE requests
 * 4. Server validates: header token === session-stored secret
 *
 * Phase 132: Migrated from double-submit cookie to synchronizer token.
 * The CSRF secret is now stored server-side in the portal IAM session,
 * not in a client-readable cookie. This is immune to cookie injection.
 */

import { randomBytes } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const CSRF_HEADER = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/* ------------------------------------------------------------------ */
/* Token generation                                                     */
/* ------------------------------------------------------------------ */

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/* ------------------------------------------------------------------ */
/* Validation -- Phase 132: session-bound synchronizer token             */
/* ------------------------------------------------------------------ */

/**
 * Validate CSRF token on write requests (POST, PUT, DELETE, PATCH).
 * The `sessionCsrfSecret` is retrieved from the server-side portal session.
 * Call inside handler body before processing.
 * Returns true if valid, sends 403 and returns false if not.
 */
export function validateCsrf(
  request: FastifyRequest,
  reply: FastifyReply,
  sessionCsrfSecret?: string
): boolean {
  const method = request.method.toUpperCase();
  // Only protect write methods
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  if (!sessionCsrfSecret) {
    reply.code(403).send({ ok: false, error: 'Invalid CSRF token' });
    return false;
  }

  const headerToken = (request.headers as any)[CSRF_HEADER];

  if (!headerToken || headerToken !== sessionCsrfSecret) {
    reply.code(403).send({ ok: false, error: 'Invalid CSRF token' });
    return false;
  }

  return true;
}

/**
 * Get CSRF header name for client reference.
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER;
}
