/**
 * Auth routes -- Phase 13 (hardened in Phase 15, Phase 49: RBAC + lockout).
 *
 * POST /auth/login       -- authenticate with VistA, create session, audit
 * POST /auth/logout      -- destroy session, audit
 * GET  /auth/session     -- return current session info
 * GET  /auth/permissions -- return RBAC permissions for current role (Phase 49)
 */

import type { FastifyInstance } from 'fastify';
import { authenticateUser } from '../vista/rpcBrokerClient.js';
import {
  createSession,
  getSession,
  destroySession,
  rotateSession,
  mapUserRole,
  type SessionData,
} from './session-store.js';
import { SESSION_CONFIG, LOCKOUT_CONFIG } from '../config/server-config.js';
import { tryResolveTenantId, loadTenantsFromDb } from '../config/tenant-config.js';
import { bindVistaSession, unbindVistaSession } from './idp/vista-binding.js';
import { log } from '../lib/logger.js';
import { audit } from '../lib/audit.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { LoginBodySchema, validate } from '../lib/validation.js';
import { getPermissionsForRole, getRbacMatrix } from './rbac.js';

const COOKIE_NAME = SESSION_CONFIG.cookieName;
// Phase 153: secure cookie when NODE_ENV=production OR PLATFORM_RUNTIME_MODE=rc|prod
const _rtMode = (process.env.PLATFORM_RUNTIME_MODE || '').toLowerCase().trim();
const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production' || _rtMode === 'rc' || _rtMode === 'prod',
  maxAge: Math.floor(SESSION_CONFIG.absoluteTtlMs / 1000),
};

/** Extract session token from cookie or Authorization header. */
function extractToken(request: {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  // Cookie first
  const cookie = (request as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  // Bearer token fallback
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Account lockout (Phase 49)                                          */
/* ------------------------------------------------------------------ */

interface LockoutEntry {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number; // 0 = not locked
}

const lockoutStore = new Map<string, LockoutEntry>();

// Clean up expired lockout entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of lockoutStore) {
      if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
        lockoutStore.delete(key);
      } else if (now - entry.firstFailureAt > LOCKOUT_CONFIG.windowMs) {
        lockoutStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
).unref();

/**
 * Check if an account is locked out. Returns lockout info or null if not locked.
 */
function checkLockout(accountKey: string): {
  locked: boolean;
  remainingMs: number;
  attempts: number;
} {
  const entry = lockoutStore.get(accountKey);
  if (!entry) return { locked: false, remainingMs: 0, attempts: 0 };

  const now = Date.now();

  // Check if lockout period has expired
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    lockoutStore.delete(accountKey);
    return { locked: false, remainingMs: 0, attempts: 0 };
  }

  // Check if failure window has expired
  if (now - entry.firstFailureAt > LOCKOUT_CONFIG.windowMs) {
    lockoutStore.delete(accountKey);
    return { locked: false, remainingMs: 0, attempts: 0 };
  }

  if (entry.lockedUntil > 0) {
    return { locked: true, remainingMs: entry.lockedUntil - now, attempts: entry.failures };
  }

  return { locked: false, remainingMs: 0, attempts: entry.failures };
}

/**
 * Record a failed login attempt. Returns true if the account is now locked.
 */
function recordFailedLogin(accountKey: string): boolean {
  const now = Date.now();
  let entry = lockoutStore.get(accountKey);

  if (!entry || now - entry.firstFailureAt > LOCKOUT_CONFIG.windowMs) {
    entry = { failures: 0, firstFailureAt: now, lockedUntil: 0 };
    lockoutStore.set(accountKey, entry);
  }

  entry.failures++;

  if (entry.failures >= LOCKOUT_CONFIG.maxAttempts) {
    entry.lockedUntil = now + LOCKOUT_CONFIG.lockoutDurationMs;
    return true;
  }

  return false;
}

/**
 * Clear lockout on successful login.
 */
function clearLockout(accountKey: string): void {
  lockoutStore.delete(accountKey);
}

/** Helper to require a valid session on a request.  Returns session or throws 401. */
export async function requireSession(request: any, reply: any): Promise<SessionData> {
  if (reply.sent) {
    if (request.session) return request.session;
    throw new Error('Reply already sent');
  }
  const token = extractToken(request);
  if (!token) {
    const err: any = new Error('No session');
    err.statusCode = 401;
    throw err;
  }
  const session = await getSession(token);
  if (!session) {
    const err: any = new Error('Invalid session');
    err.statusCode = 401;
    throw err;
  }
  return session;
}

/** Helper to require a specific role. */
export function requireRole(session: SessionData, roles: string[], reply: any): void {
  if (reply.sent) throw new Error('Reply already sent');
  if (!roles.includes(session.role)) {
    reply.code(403).send({ ok: false, error: 'Insufficient privileges', requiredRoles: roles });
    throw new Error('Forbidden');
  }
}

export default async function authRoutes(server: FastifyInstance): Promise<void> {
  // POST /auth/login
  server.post('/auth/login', async (request, reply) => {
    const requestId = (request as any).requestId;
    const sourceIp = request.ip;

    // Phase 15A: Validate input with zod
    const parsed = validate(LoginBodySchema, request.body);
    if (!parsed.ok) {
      audit(
        'security.invalid-input',
        'failure',
        { duz: 'anonymous' },
        {
          requestId,
          sourceIp,
          detail: { endpoint: '/auth/login', errors: parsed.details },
        }
      );
      return reply.code(400).send({
        ok: false,
        error: 'Invalid request body',
        details: parsed.details,
      });
    }

    const { accessCode, verifyCode } = parsed.data;

    // Phase 49: Account lockout check (keyed on accessCode, lowercased)
    const accountKey = accessCode.toLowerCase();
    const lockoutStatus = checkLockout(accountKey);
    if (lockoutStatus.locked) {
      audit(
        'auth.locked',
        'denied',
        { duz: 'anonymous' },
        {
          requestId,
          sourceIp,
          detail: { remainingMs: lockoutStatus.remainingMs, attempts: lockoutStatus.attempts },
        }
      );
      immutableAudit(
        'auth.lockout' as any,
        'denied',
        {
          sub: 'anonymous',
          name: 'anonymous',
          roles: [],
        },
        { requestId, sourceIp, detail: { reason: 'account-locked' } }
      );
      log.warn('Login blocked: account locked', { sourceIp });
      return reply.code(429).send({
        ok: false,
        error: 'Account temporarily locked due to repeated failed attempts',
        retryAfterMs: lockoutStatus.remainingMs,
      });
    }

    try {
      // Authenticate against VistA
      const userInfo = await authenticateUser(accessCode, verifyCode);

      // Phase 49: Clear lockout on successful login
      clearLockout(accountKey);

      // Create session
      const role = mapUserRole(userInfo.userName);
      let tenantId = tryResolveTenantId(userInfo.facilityStation);
      if (!tenantId && userInfo.facilityStation) {
        await loadTenantsFromDb();
        tenantId = tryResolveTenantId(userInfo.facilityStation);
      }
      if (!tenantId) {
        log.warn('Login rejected: tenant resolution failed', {
          duz: userInfo.duz,
          facilityStation: userInfo.facilityStation,
        });
        return reply.code(403).send({
          ok: false,
          error: 'Tenant resolution failed for authenticated facility',
        });
      }
      const token = await createSession({
        duz: userInfo.duz,
        userName: userInfo.userName,
        role,
        facilityStation: userInfo.facilityStation,
        facilityName: userInfo.facilityName,
        divisionIen: userInfo.divisionIen,
        tenantId,
      });

      // Rotate session token to prevent fixation (Phase 15B)
      const finalToken = SESSION_CONFIG.rotateOnLogin
        ? ((await rotateSession(token)) ?? token)
        : token;

      const rpcBinding = await bindVistaSession(finalToken, accessCode, verifyCode, {
        tenantId,
        userInfo,
      });
      if (!rpcBinding.ok) {
        await destroySession(finalToken);
        reply.clearCookie(COOKIE_NAME, { path: '/' });
        log.warn('Login rejected: clinician RPC binding failed', {
          duz: userInfo.duz,
          tenantId,
        });
        return reply.code(503).send({
          ok: false,
          error: 'Failed to establish clinician VistA session',
        });
      }

      // Set cookie (httpOnly -- no JS access)
      reply.setCookie(COOKIE_NAME, finalToken, COOKIE_OPTS);

      // Phase 132: CSRF token is now session-bound (synchronizer token pattern).
      // Delivered via JSON response body -- no more double-submit cookie.
      // Client stores this in JS memory and sends as x-csrf-token header.
      const loggedInSession = await getSession(finalToken);

      // Phase 15C: Audit successful login
      audit(
        'auth.login',
        'success',
        {
          duz: userInfo.duz,
          name: userInfo.userName,
          role,
        },
        { requestId, sourceIp }
      );

      // Phase 35: Immutable audit (hash-chained)
      immutableAudit(
        'auth.login',
        'success',
        {
          sub: userInfo.duz,
          name: userInfo.userName,
          roles: [role],
        },
        { requestId, sourceIp, tenantId }
      );

      log.info('User authenticated', { duz: userInfo.duz, role });

      // Phase 15B: Do NOT expose token in response body -- cookie-only transport
      return {
        ok: true,
        csrfToken: loggedInSession?.csrfSecret || '',
        session: {
          duz: userInfo.duz,
          userName: userInfo.userName,
          role,
          facilityStation: userInfo.facilityStation,
          facilityName: userInfo.facilityName,
          divisionIen: userInfo.divisionIen,
          tenantId,
          permissions: getPermissionsForRole(role),
        },
      };
    } catch (err: any) {
      // Phase 49: Record failed attempt for lockout
      const nowLocked = recordFailedLogin(accountKey);
      if (nowLocked) {
        log.warn('Account locked after repeated failures', { sourceIp });
        immutableAudit(
          'auth.lockout' as any,
          'denied',
          {
            sub: 'anonymous',
            name: 'anonymous',
            roles: [],
          },
          { requestId, sourceIp, detail: { reason: 'max-attempts-reached' } }
        );
      }

      // Phase 15C: Audit failed login (never log credentials)
      audit(
        'auth.failed',
        'failure',
        { duz: 'anonymous' },
        {
          requestId,
          sourceIp,
          detail: { error: err.message },
        }
      );

      // Phase 35: Immutable audit (hash-chained)
      immutableAudit(
        'auth.failed',
        'failure',
        {
          sub: 'anonymous',
          name: 'anonymous',
          roles: [],
        },
        { requestId, sourceIp, detail: { error: 'authentication-failed' } }
      );
      log.warn('Login failed', { error: err.message, sourceIp });
      return reply.code(401).send({
        ok: false,
        error: 'Authentication failed',
      });
    }
  });

  // POST /auth/logout
  server.post('/auth/logout', async (request, reply) => {
    const token = extractToken(request);
    const session = token ? await getSession(token) : null;

    if (token) {
      unbindVistaSession(token);
      await destroySession(token);
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });

    // Phase 15C: Audit logout
    audit(
      'auth.logout',
      'success',
      {
        duz: session?.duz,
        name: session?.userName,
        role: session?.role,
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      }
    );

    // Phase 35: Immutable audit (hash-chained)
    immutableAudit(
      'auth.logout',
      'success',
      {
        sub: session?.duz || 'unknown',
        name: session?.userName || 'unknown',
        roles: [session?.role || 'unknown'],
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      }
    );

    return { ok: true };
  });

  // GET /auth/session
  server.get('/auth/session', async (request, reply) => {
    const token = extractToken(request);
    if (!token) {
      return { ok: false, authenticated: false };
    }
    const session = await getSession(token);
    if (!session) {
      reply.clearCookie(COOKIE_NAME, { path: '/' });
      return { ok: false, authenticated: false };
    }
    return {
      ok: true,
      authenticated: true,
      csrfToken: session.csrfSecret || '',
      session: {
        duz: session.duz,
        userName: session.userName,
        role: session.role,
        facilityStation: session.facilityStation,
        facilityName: session.facilityName,
        divisionIen: session.divisionIen,
        tenantId: session.tenantId,
        permissions: getPermissionsForRole(session.role),
      },
    };
  });

  // GET /auth/csrf-token -- Phase 132: Dedicated CSRF token endpoint
  // Returns the session-bound CSRF secret for clients that need it after page refresh.
  // Requires a valid session (cookie sent automatically). Safe method (GET).
  server.get('/auth/csrf-token', async (request, reply) => {
    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    const session = await getSession(token);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Session expired or invalid' });
    }
    return { ok: true, csrfToken: session.csrfSecret || '' };
  });

  // GET /auth/permissions (Phase 49: RBAC introspection)
  server.get('/auth/permissions', async (request, reply) => {
    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    const session = await getSession(token);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Session expired or invalid' });
    }
    return {
      ok: true,
      role: session.role,
      permissions: getPermissionsForRole(session.role),
    };
  });

  // GET /auth/rbac-matrix (Phase 49: full RBAC matrix for admin/docs)
  server.get('/auth/rbac-matrix', async (request, reply) => {
    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    const session = await getSession(token);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Session expired or invalid' });
    }
    // Only admin can see the full matrix
    if (session.role !== 'admin') {
      return reply.code(403).send({ ok: false, error: 'Admin only' });
    }
    return {
      ok: true,
      matrix: getRbacMatrix(),
    };
  });
}
