import { API_BASE } from '@/lib/api-config';
/**
 * CSRF Token Manager -- Phase 132
 *
 * Session-bound synchronizer token pattern (OWASP recommended).
 *
 * The CSRF token is:
 *   1. Generated server-side at session creation (randomBytes(32))
 *   2. Stored in the DB-backed session (never in a cookie)
 *   3. Delivered to the client via JSON response body:
 *      - POST /auth/login -> response.csrfToken
 *      - GET /auth/session -> response.csrfToken
 *      - GET /auth/csrf-token -> response.csrfToken (dedicated endpoint)
 *   4. Cached in JS memory (this module) -- NOT in cookies, NOT in localStorage
 *   5. Sent back on every mutation as the x-csrf-token header
 *   6. Validated server-side against the session-bound secret
 *
 * Why this is safer than double-submit cookie:
 *   - Cookie injection (subdomain, HTTP MitM) cannot forge the token
 *   - Token is never stored in a cookie, so it's invisible to XSS on
 *     `document.cookie` (though XSS can still read JS vars -- CSP helps there)
 *   - Server-side binding means the token is cryptographically tied to the session
 */

/** In-memory CSRF token cache. Cleared on logout or page unload. */
let _token: string = '';

/**
 * Set the CSRF token (called after login or session check).
 */
export function setCsrfToken(token: string): void {
  _token = token;
}

/**
 * Get the current CSRF token. If not cached, fetches from the server.
 * Returns empty string if not authenticated.
 */
export async function getCsrfToken(): Promise<string> {
  if (_token) return _token;
  // Try to fetch from the dedicated endpoint
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.csrfToken) {
        _token = data.csrfToken;
        return _token;
      }
    }
  } catch {
    // Server unreachable -- return empty
  }
  return '';
}

/**
 * Get the CSRF token synchronously (returns cached value, empty if not yet fetched).
 * Use this when you know the token was already fetched (e.g., after login).
 */
export function getCsrfTokenSync(): string {
  return _token;
}

/**
 * Get a headers object with the CSRF token for mutation requests.
 * Returns `{ 'x-csrf-token': token }` if cached, empty object otherwise.
 * Usage: `headers: { 'content-type': 'application/json', ...csrfHeaders() }`
 */
export function csrfHeaders(): Record<string, string> {
  return _token ? { 'x-csrf-token': _token } : {};
}

/**
 * Clear the cached CSRF token (on logout).
 */
export function clearCsrfToken(): void {
  _token = '';
}
