/**
 * CSRF Token Utility — Phase 29
 *
 * Double-submit cookie pattern for CSRF protection on portal write actions.
 *
 * Flow:
 * 1. GET /portal/iam/csrf-token — returns { csrfToken } and sets csrf_token cookie
 * 2. Client includes X-CSRF-Token header on all POST/PUT/DELETE requests
 * 3. Server validates: header token === cookie token
 *
 * Uses crypto.randomBytes for token generation (no npm deps).
 */

import { randomBytes } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/* ------------------------------------------------------------------ */
/* Token generation                                                     */
/* ------------------------------------------------------------------ */

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/* ------------------------------------------------------------------ */
/* Cookie options                                                       */
/* ------------------------------------------------------------------ */

export const CSRF_COOKIE_OPTS = {
  path: "/",
  httpOnly: false, // JS must read this cookie to send in header
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 60, // 30 minutes
};

/* ------------------------------------------------------------------ */
/* Validation middleware                                                 */
/* ------------------------------------------------------------------ */

/**
 * Validate CSRF token on write requests (POST, PUT, DELETE, PATCH).
 * Call inside handler body before processing.
 * Returns true if valid, sends 403 and returns false if not.
 */
export function validateCsrf(request: FastifyRequest, reply: FastifyReply): boolean {
  const method = request.method.toUpperCase();
  // Only protect write methods
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const cookieToken = (request as any).cookies?.[CSRF_COOKIE];
  const headerToken = (request.headers as any)[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    reply.code(403).send({ ok: false, error: "Invalid CSRF token" });
    return false;
  }

  return true;
}

/**
 * Get CSRF cookie name for client reference.
 */
export function getCsrfCookieName(): string {
  return CSRF_COOKIE;
}

/**
 * Get CSRF header name for client reference.
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER;
}
