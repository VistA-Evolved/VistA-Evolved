import { API_BASE } from '@/lib/api-config';
/**
 * Portal CSRF Token Manager
 *
 * Mirrors the web app's CSRF pattern (apps/web/src/lib/csrf.ts).
 * Token is fetched from /portal/iam/csrf-token and cached in memory.
 */

let _token = '';

export function setCsrfToken(token: string): void {
  _token = token;
}

export async function getCsrfToken(): Promise<string> {
  if (_token) return _token;
  try {
    const res = await fetch(`${API_BASE}/portal/iam/csrf-token`, {
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
    // Server unreachable
  }
  return '';
}

export function getCsrfTokenSync(): string {
  return _token;
}

export function csrfHeaders(): Record<string, string> {
  return _token ? { 'x-csrf-token': _token } : {};
}

export function clearCsrfToken(): void {
  _token = '';
}
