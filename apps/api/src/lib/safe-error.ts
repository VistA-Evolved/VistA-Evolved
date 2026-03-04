/**
 * Safe Error Sanitizer — Shared utility for API error responses.
 *
 * Prevents leaking internal details (file paths, MUMPS global refs,
 * credential fragments, stack traces) in HTTP/WebSocket responses.
 *
 * Every catch handler that sends err.message to clients MUST use this.
 */

/**
 * Sanitize an error for safe inclusion in API responses.
 *
 * - Strips Windows/Unix file paths
 * - Strips MUMPS global/routine references (^GLOBAL, %ROUTINE)
 * - Redacts credential-related keywords
 * - Redacts VistA config env var mentions
 * - Maps common connection errors to user-friendly messages
 * - Truncates to 200 chars max
 */
export function safeErr(err: unknown): string {
  if (!(err instanceof Error)) return 'Operation failed';

  const m = err.message;

  // Credential / config leaks
  if (
    m.includes('credential') ||
    m.includes('VISTA_') ||
    m.includes('password') ||
    m.includes('ACCESS_CODE') ||
    m.includes('VERIFY_CODE')
  ) {
    return 'Configuration error';
  }

  // Connection errors — user-friendly
  if (m.includes('ECONNREFUSED') || m.includes('ECONNRESET') || m.includes('ETIMEDOUT')) {
    return 'VistA service unavailable';
  }
  if (m.includes('timeout') || m.includes('TIMEOUT')) {
    return 'Request timed out';
  }

  // Strip sensitive patterns
  let s = m
    .replace(/\^[A-Z][A-Z0-9]*/g, '') // MUMPS globals (^GLOBAL)
    .replace(/%[A-Z][A-Z0-9]*/g, '') // MUMPS % routines
    .replace(/[A-Z]:\\[^\s]+/g, '') // Windows file paths
    .replace(/\/[^\s]*\/[^\s]*/g, '') // Unix file paths
    .replace(/at\s+\S+\s+\([^)]+\)/g, '') // Stack trace frames
    .replace(/\n\s+at\s+.*/g, '') // Multi-line stack frames
    .replace(/node:internal\/[^\s]*/g, '') // Node internal refs
    .replace(/\s{2,}/g, ' ') // Collapse whitespace
    .trim();

  if (s.length > 200) s = s.slice(0, 200) + '...';
  return s || 'Operation failed';
}
