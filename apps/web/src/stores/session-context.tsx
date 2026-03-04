'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { setCsrfToken, clearCsrfToken, csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';
import type { UserRole } from '@vista-evolved/shared-types';

/* ------------------------------------------------------------------ */
/* Types — UserRole now imported from shared-types                     */
/* ------------------------------------------------------------------ */

export type { UserRole };

export interface SessionUser {
  duz: string;
  userName: string;
  role: UserRole;
  facilityStation: string;
  facilityName: string;
  divisionIen: string;
  /** Phase 35: OIDC tenant ID (if OIDC-sourced session) */
  tenantId?: string;
  /** Phase 35: Authentication method used */
  authMethod?: 'vista-rpc' | 'oidc' | 'passkey';
}

export interface SessionContextValue {
  /** Whether the session check has completed */
  ready: boolean;
  /** Whether user is authenticated */
  authenticated: boolean;
  /** Current user info (null if not authenticated) */
  user: SessionUser | null;
  /** Login with access/verify codes */
  login: (accessCode: string, verifyCode: string) => Promise<{ ok: boolean; error?: string }>;
  /** Logout and clear session */
  logout: () => Promise<void>;
  /** Check if user has one of the specified roles */
  hasRole: (...roles: UserRole[]) => boolean;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  /** Check existing session on mount (cookie sent automatically). */
  useEffect(() => {
    fetch(`${API_BASE}/auth/session`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.authenticated && data.session) {
          setUser(data.session);
          setAuthenticated(true);
          // Phase 132: Capture session-bound CSRF token
          if (data.csrfToken) setCsrfToken(data.csrfToken);
        }
      })
      .catch(() => {
        // no valid session — stay unauthenticated
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (accessCode: string, verifyCode: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, verifyCode }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setUser(data.session);
        setAuthenticated(true);
        // Phase 132: Capture session-bound CSRF token from login response
        if (data.csrfToken) setCsrfToken(data.csrfToken);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Login failed' };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: '{}',
      });
    } catch {
      /* best-effort */
    }
    setUser(null);
    setAuthenticated(false);
    clearCsrfToken();
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <SessionContext.Provider value={{ ready, authenticated, user, login, logout, hasRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be inside <SessionProvider>');
  return ctx;
}
