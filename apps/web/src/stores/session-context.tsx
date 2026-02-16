'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type UserRole = 'provider' | 'nurse' | 'pharmacist' | 'clerk' | 'admin';

export interface SessionUser {
  duz: string;
  userName: string;
  role: UserRole;
  facilityStation: string;
  facilityName: string;
  divisionIen: string;
}

export interface SessionContextValue {
  /** Whether the session check has completed */
  ready: boolean;
  /** Whether user is authenticated */
  authenticated: boolean;
  /** Current user info (null if not authenticated) */
  user: SessionUser | null;
  /** Session token (for API calls) */
  token: string | null;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';
const LS_TOKEN_KEY = 'ehr_session_token';

/* ------------------------------------------------------------------ */
/* Context + Provider                                                  */
/* ------------------------------------------------------------------ */

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  /** Check existing session on mount. */
  useEffect(() => {
    const savedToken = localStorage.getItem(LS_TOKEN_KEY);
    if (!savedToken) {
      setReady(true);
      return;
    }

    fetch(`${API_BASE}/auth/session`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.authenticated && data.session) {
          setUser(data.session);
          setToken(savedToken);
          setAuthenticated(true);
        } else {
          localStorage.removeItem(LS_TOKEN_KEY);
        }
      })
      .catch(() => {
        localStorage.removeItem(LS_TOKEN_KEY);
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
        setToken(data.session.token);
        setAuthenticated(true);
        localStorage.setItem(LS_TOKEN_KEY, data.session.token);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Login failed' };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    const savedToken = localStorage.getItem(LS_TOKEN_KEY);
    if (savedToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
          body: '{}',
        });
      } catch { /* best-effort */ }
    }
    setUser(null);
    setToken(null);
    setAuthenticated(false);
    localStorage.removeItem(LS_TOKEN_KEY);
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <SessionContext.Provider value={{ ready, authenticated, user, token, login, logout, hasRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be inside <SessionProvider>');
  return ctx;
}
