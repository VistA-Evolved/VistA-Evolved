/**
 * Portal IAM Routes -- Phase 29
 *
 * Patient Identity & Access Management, Proxy Workflows, Access Logs.
 *
 * Route groups:
 *   /portal/iam/register           -- Create portal account
 *   /portal/iam/login              -- Login with portal credentials
 *   /portal/iam/logout             -- Destroy portal IAM session
 *   /portal/iam/session            -- Get current session
 *   /portal/iam/csrf-token         -- Get CSRF token
 *   /portal/iam/password/change    -- Change password
 *   /portal/iam/password/reset     -- Request password reset
 *   /portal/iam/password/confirm   -- Confirm password reset
 *   /portal/iam/mfa/setup          -- Setup MFA (TOTP)
 *   /portal/iam/mfa/confirm        -- Confirm MFA setup
 *   /portal/iam/mfa/disable        -- Disable MFA
 *   /portal/iam/profiles           -- List patient profiles
 *   /portal/iam/profiles/:id       -- Remove patient profile
 *   /portal/iam/devices            -- List device sessions
 *   /portal/iam/devices/:id/revoke -- Revoke device session
 *   /portal/iam/devices/revoke-all -- Revoke all device sessions
 *   /portal/iam/proxy/invite       -- Create proxy invitation
 *   /portal/iam/proxy/invitations  -- List invitations
 *   /portal/iam/proxy/invitations/:id/respond -- Accept/decline
 *   /portal/iam/proxy/invitations/:id/cancel  -- Cancel invitation
 *   /portal/iam/activity           -- Get access log
 *   /portal/iam/stats              -- Admin stats
 *
 * Auth model: Portal routes use their own session check (portal IAM session),
 * NOT the clinician session. The global auth gateway skips /portal/* routes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'node:crypto';
import {
  createUser,
  authenticateUser,
  getUserById,
  getUserByEmail,
  generatePasswordResetToken,
  resetPassword,
  changePassword,
  setupMfa,
  confirmMfa,
  disableMfa,
  isMfaEnabled,
  validatePasswordStrength,
  removePatientProfile,
  listDeviceSessions,
  revokeDeviceSession,
  revokeAllDeviceSessions,
  createDeviceSession,
  getIamStats,
} from './portal-user-store.js';
import {
  createProxyInvitation,
  respondToInvitation,
  cancelInvitation,
  getInvitationsForUser,
  getInvitationsForPatient,
  getProxyInvitationStats,
} from './proxy-store.js';
import { getAccessLog, logSignIn, logSignOut, getAccessLogStats } from './access-log-store.js';
import { generateCsrfToken, validateCsrf } from './csrf.js';
import { portalAudit } from '../services/portal-audit.js';
import { log } from '../lib/logger.js';
import type { PortalUser } from './types.js';
import { requireSession, requireRole } from '../auth/auth-routes.js';

/* ------------------------------------------------------------------ */
/* IAM Session Store (separate from Phase 26 portal session)            */
/* ------------------------------------------------------------------ */

interface IamSession {
  token: string;
  userId: string;
  tenantId: string;
  displayName: string;
  /** Primary patient DFN (self profile) -- for backward compat with portal routes */
  patientDfn: string | null;
  patientName: string | null;
  /** Currently active profile (for proxy switching) */
  activeProfileId: string | null;
  /** Phase 132: session-bound CSRF secret (synchronizer token pattern) */
  csrfSecret: string;
  createdAt: number;
  lastActivity: number;
}

const iamSessions = new Map<string, IamSession>();
const IAM_COOKIE = 'portal_iam_session';
const IAM_SESSION_TTL_MS = 30 * 60 * 1000; // 30 min absolute
const IAM_IDLE_TTL_MS = 15 * 60 * 1000; // 15 min idle

// Cleanup expired IAM sessions
setInterval(() => {
  const cutoff = Date.now();
  for (const [token, session] of iamSessions) {
    if (
      cutoff - session.createdAt > IAM_SESSION_TTL_MS ||
      cutoff - session.lastActivity > IAM_IDLE_TTL_MS
    ) {
      iamSessions.delete(token);
    }
  }
}, 60_000).unref();

/* ------------------------------------------------------------------ */
/* IAM Session Helpers                                                  */
/* ------------------------------------------------------------------ */

function createIamSession(user: PortalUser): string {
  const token = randomBytes(32).toString('hex');
  const selfProfile = user.patientProfiles.find((p) => p.isSelf);
  const nowMs = Date.now();
  iamSessions.set(token, {
    token,
    userId: user.id,
    tenantId: user.tenantId,
    displayName: user.displayName,
    patientDfn: selfProfile?.patientDfn ?? null,
    patientName: selfProfile?.patientName ?? null,
    activeProfileId: selfProfile?.id ?? null,
    csrfSecret: generateCsrfToken(),
    createdAt: nowMs,
    lastActivity: nowMs,
  });
  return token;
}

export function getIamSession(request: FastifyRequest): IamSession | null {
  const cookie = (request as any).cookies?.[IAM_COOKIE];
  if (!cookie) return null;
  const session = iamSessions.get(cookie);
  if (!session) return null;

  const nowMs = Date.now();
  if (
    nowMs - session.createdAt > IAM_SESSION_TTL_MS ||
    nowMs - session.lastActivity > IAM_IDLE_TTL_MS
  ) {
    iamSessions.delete(cookie);
    return null;
  }

  session.lastActivity = nowMs;
  return session;
}

function requireIamSession(request: FastifyRequest, reply: FastifyReply): IamSession {
  const session = getIamSession(request);
  if (!session) {
    const err: any = new Error('No IAM session');
    err.statusCode = 401;
    throw err;
  }
  return session;
}

const IAM_COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict' as const,
  secure:
    process.env.NODE_ENV === 'production' ||
    ['rc', 'prod'].includes((process.env.PLATFORM_RUNTIME_MODE || '').toLowerCase().trim()),
  maxAge: Math.floor(IAM_SESSION_TTL_MS / 1000),
};

/* ------------------------------------------------------------------ */
/* Rate limiter for IAM auth endpoints                                  */
/* ------------------------------------------------------------------ */

const authAttempts = new Map<string, { count: number; resetAt: number }>();
const IAM_MAX_ATTEMPTS = 5;
const IAM_WINDOW_MS = 15 * 60 * 1000;

function checkIamRate(ip: string): boolean {
  const nowMs = Date.now();
  const bucket = authAttempts.get(ip);
  if (!bucket || bucket.resetAt <= nowMs) {
    authAttempts.set(ip, { count: 1, resetAt: nowMs + IAM_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= IAM_MAX_ATTEMPTS;
}

// Cleanup rate buckets
setInterval(() => {
  const cutoff = Date.now();
  for (const [ip, bucket] of authAttempts) {
    if (bucket.resetAt <= cutoff) authAttempts.delete(ip);
  }
}, 60_000).unref();

/* ------------------------------------------------------------------ */
/* Route Plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function portalIamRoutes(server: FastifyInstance): Promise<void> {
  /* ================================================================ */
  /* CSRF Token                                                        */
  /* ================================================================ */

  server.get('/portal/iam/csrf-token', async (request, reply) => {
    // Phase 132: Return session-bound CSRF secret (no more cookie)
    const session = getIamSession(request);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    return { ok: true, csrfToken: session.csrfSecret };
  });

  /* ================================================================ */
  /* Registration                                                      */
  /* ================================================================ */

  server.post('/portal/iam/register', async (request, reply) => {
    const ip = request.ip;
    if (!checkIamRate(ip)) {
      return reply.code(429).send({ ok: false, error: 'Too many requests. Try again later.' });
    }

    const body = (request.body as any) || {};
    const { username, email, password, displayName, patientDfn, patientName } = body;

    if (!username || !email || !password || !displayName) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing required fields: username, email, password, displayName',
      });
    }

    // Validate password strength
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return reply.code(400).send({ ok: false, error: 'Password too weak', details: pwCheck.errors });
    }

    try {
      const user = await createUser(
        username,
        email,
        password,
        displayName,
        patientDfn && patientName ? { dfn: patientDfn, name: patientName } : undefined,
        typeof body.tenantId === 'string' && body.tenantId.trim().length > 0
          ? body.tenantId.trim()
          : undefined
      );

      portalAudit('portal.login', 'success', patientDfn ?? 'none', {
        tenantId: user.tenantId,
        detail: { action: 'register', userId: user.id },
      });

      return reply.code(201).send({
        ok: true,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          status: user.status,
        },
      });
    } catch (_err: any) {
      return reply.code(409).send({ ok: false, error: 'Registration failed' });
    }
  });

  /* ================================================================ */
  /* Login                                                             */
  /* ================================================================ */

  server.post('/portal/iam/login', async (request, reply) => {
    const ip = request.ip;
    if (!checkIamRate(ip)) {
      reply.code(429).send({ ok: false, error: 'Too many requests. Try again later.' });
      return;
    }

    const body = (request.body as any) || {};
    const { username, password, totpCode } = body;

    if (!username || !password) {
      reply.code(400).send({ ok: false, error: 'Missing username or password' });
      return;
    }

    const result = await authenticateUser(username, password);
    if (!result.success || !result.user) {
      portalAudit('portal.login.failed', 'failure', 'unknown', {
        detail: { username, ip },
      });
      reply.code(401).send({ ok: false, error: result.error || 'Authentication failed' });
      return;
    }

    // MFA check
    if (result.requiresMfa) {
      if (!totpCode) {
        reply.code(200).send({ ok: true, requiresMfa: true, message: 'TOTP code required' });
        return;
      }
      const mfaValid = confirmMfa(result.user.id, totpCode);
      if (!mfaValid) {
        reply.code(401).send({ ok: false, error: 'Invalid TOTP code' });
        return;
      }
    }

    // Create session
    const token = createIamSession(result.user);

    // Track device
    const ua = request.headers['user-agent'] ?? 'unknown';
    createDeviceSession(result.user.id, token, {
      userAgent: typeof ua === 'string' ? ua : (ua[0] ?? 'unknown'),
      ipAddress: ip,
    });

    // Log access
    logSignIn(result.user.id, result.user.displayName, { ip });

    portalAudit('portal.login', 'success', result.user.patientProfiles[0]?.patientDfn ?? 'none', {
      tenantId: result.user.tenantId,
      detail: { userId: result.user.id },
    });

    return reply.setCookie(IAM_COOKIE, token, IAM_COOKIE_OPTS).send({
      ok: true,
      user: {
        id: result.user.id,
        tenantId: result.user.tenantId,
        username: result.user.username,
        displayName: result.user.displayName,
        profiles: result.user.patientProfiles.map((p) => ({
          id: p.id,
          patientDfn: p.patientDfn,
          patientName: p.patientName,
          relationship: p.relationship,
          isSelf: p.isSelf,
          accessLevel: p.accessLevel,
        })),
        mfaEnabled: result.user.mfaEnabled,
      },
    });
  });

  /* ================================================================ */
  /* Logout                                                            */
  /* ================================================================ */

  server.post('/portal/iam/logout', async (request, reply) => {
    const session = getIamSession(request);
    if (session) {
      logSignOut(session.userId, session.displayName);
      iamSessions.delete(session.token);
      portalAudit('portal.logout', 'success', session.patientDfn ?? 'none', {
        tenantId: session.tenantId,
        detail: { userId: session.userId },
      });
    }
    reply.clearCookie(IAM_COOKIE, { path: '/' }).send({ ok: true });
  });

  /* ================================================================ */
  /* Session                                                           */
  /* ================================================================ */

  server.get('/portal/iam/session', async (request, reply) => {
    const session = getIamSession(request);
    if (!session) {
      reply.code(401).send({ ok: false, error: 'Not authenticated' });
      return;
    }

    const user = getUserById(session.userId);
    return {
      ok: true,
      session: {
        userId: session.userId,
        tenantId: session.tenantId,
        displayName: session.displayName,
        patientDfn: session.patientDfn,
        patientName: session.patientName,
        activeProfileId: session.activeProfileId,
        profiles:
          user?.patientProfiles.map((p) => ({
            id: p.id,
            patientDfn: p.patientDfn,
            patientName: p.patientName,
            relationship: p.relationship,
            isSelf: p.isSelf,
            accessLevel: p.accessLevel,
          })) ?? [],
        mfaEnabled: user?.mfaEnabled ?? false,
      },
    };
  });

  /* ================================================================ */
  /* Password Change                                                   */
  /* ================================================================ */

  server.post('/portal/iam/password/change', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const body = (request.body as any) || {};
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      reply.code(400).send({ ok: false, error: 'Missing currentPassword or newPassword' });
      return;
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      reply.code(400).send({ ok: false, error: 'New password too weak', details: pwCheck.errors });
      return;
    }

    const result = await changePassword(session.userId, currentPassword, newPassword);
    if (!result.success) {
      reply.code(400).send({ ok: false, error: result.error });
      return;
    }

    return { ok: true, message: 'Password changed successfully' };
  });

  /* ================================================================ */
  /* Password Reset Request                                            */
  /* ================================================================ */

  server.post('/portal/iam/password/reset', async (request, reply) => {
    const ip = request.ip;
    if (!checkIamRate(ip)) {
      reply.code(429).send({ ok: false, error: 'Too many requests' });
      return;
    }

    const body = (request.body as any) || {};
    const { email } = body;

    if (!email) {
      reply.code(400).send({ ok: false, error: 'Missing email' });
      return;
    }

    const user = getUserByEmail(email);
    if (user) {
      const token = generatePasswordResetToken(user.id);
      // In production: send token via email. For dev: log it.
      if (token) {
        log.info(
          `Password reset token generated for ${user.id} (dev only): ${token.slice(0, 8)}...`
        );
      }
    }

    // Always return success to avoid leaking registered emails
    return { ok: true, message: 'If the email is registered, a reset link has been sent.' };
  });

  /* ================================================================ */
  /* Password Reset Confirm                                            */
  /* ================================================================ */

  server.post('/portal/iam/password/confirm', async (request, reply) => {
    const body = (request.body as any) || {};
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      reply.code(400).send({ ok: false, error: 'Missing token or newPassword' });
      return;
    }

    const pwCheck = validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      reply.code(400).send({ ok: false, error: 'Password too weak', details: pwCheck.errors });
      return;
    }

    const result = await resetPassword(token, newPassword);
    if (!result.success) {
      reply.code(400).send({ ok: false, error: result.error });
      return;
    }

    return { ok: true, message: 'Password reset successfully' };
  });

  /* ================================================================ */
  /* MFA Setup                                                         */
  /* ================================================================ */

  server.post('/portal/iam/mfa/setup', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    if (!isMfaEnabled()) {
      reply.code(400).send({ ok: false, error: 'MFA is not enabled on this instance' });
      return;
    }

    const result = setupMfa(session.userId);
    if (!result) {
      reply.code(400).send({ ok: false, error: 'Failed to setup MFA' });
      return;
    }

    return {
      ok: true,
      mfa: {
        secret: result.secret,
        qrCodeUri: result.uri,
      },
    };
  });

  server.post('/portal/iam/mfa/confirm', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const body = (request.body as any) || {};
    const { code } = body;

    if (!code) {
      reply.code(400).send({ ok: false, error: 'Missing TOTP code' });
      return;
    }

    const ok = confirmMfa(session.userId, code);
    if (!ok) {
      reply.code(400).send({ ok: false, error: 'Invalid TOTP code' });
      return;
    }

    return { ok: true, message: 'MFA enabled successfully' };
  });

  server.post('/portal/iam/mfa/disable', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    disableMfa(session.userId);
    return { ok: true, message: 'MFA disabled' };
  });

  /* ================================================================ */
  /* Patient Profiles                                                  */
  /* ================================================================ */

  server.get('/portal/iam/profiles', async (request, reply) => {
    const session = requireIamSession(request, reply);
    const user = getUserById(session.userId);
    if (!user) {
      reply.code(404).send({ ok: false, error: 'User not found' });
      return;
    }

    return {
      ok: true,
      profiles: user.patientProfiles.map((p) => ({
        id: p.id,
        patientDfn: p.patientDfn,
        patientName: p.patientName,
        relationship: p.relationship,
        isSelf: p.isSelf,
        accessLevel: p.accessLevel,
        enrolledAt: p.enrolledAt,
        verified: p.verified,
      })),
    };
  });

  server.delete('/portal/iam/profiles/:id', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const { id } = request.params as { id: string };
    const user = getUserById(session.userId);
    if (!user) {
      reply.code(404).send({ ok: false, error: 'User not found' });
      return;
    }

    const profile = user.patientProfiles.find((p) => p.id === id);
    if (!profile) {
      reply.code(404).send({ ok: false, error: 'Profile not found' });
      return;
    }
    if (profile.isSelf) {
      reply.code(400).send({ ok: false, error: 'Cannot remove self profile' });
      return;
    }

    const removed = removePatientProfile(session.userId, id);
    if (!removed) {
      reply.code(500).send({ ok: false, error: 'Failed to remove profile' });
      return;
    }

    return { ok: true };
  });

  /* ================================================================ */
  /* Device Sessions                                                   */
  /* ================================================================ */

  server.get('/portal/iam/devices', async (request, reply) => {
    const session = requireIamSession(request, reply);
    const devices = listDeviceSessions(session.userId);

    return {
      ok: true,
      devices: devices.map((d) => ({
        id: d.id,
        deviceType: d.deviceType,
        userAgent: d.userAgent,
        ipAddress: d.ipAddress,
        createdAt: d.createdAt,
        lastActiveAt: d.lastActiveAt,
        active: d.active,
      })),
    };
  });

  server.post('/portal/iam/devices/:id/revoke', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const { id } = request.params as { id: string };
    const ok = revokeDeviceSession(session.userId, id);
    if (!ok) {
      reply.code(404).send({ ok: false, error: 'Device session not found' });
      return;
    }

    return { ok: true };
  });

  server.post('/portal/iam/devices/revoke-all', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const count = revokeAllDeviceSessions(session.userId);
    return { ok: true, revokedCount: count };
  });

  /* ================================================================ */
  /* Proxy Invitations                                                 */
  /* ================================================================ */

  server.post('/portal/iam/proxy/invite', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const body = (request.body as any) || {};
    const {
      patientDfn,
      patientName,
      relationship,
      accessLevel,
      reason,
      verificationDocRef,
      patientAge,
    } = body;

    if (!patientDfn || !patientName || !relationship || !reason) {
      reply.code(400).send({
        ok: false,
        error: 'Missing required fields: patientDfn, patientName, relationship, reason',
      });
      return;
    }

    try {
      const invitation = createProxyInvitation({
        tenantId: session.tenantId,
        requestorUserId: session.userId,
        requestorName: session.displayName,
        patientDfn,
        patientName,
        relationship,
        requestedAccessLevel: accessLevel || 'read_only',
        reason,
        verificationDocRef,
        patientAge,
      });

      return { ok: true, invitation };
    } catch (_err: any) {
      reply.code(400).send({ ok: false, error: 'Invalid proxy invitation request' });
    }
  });

  server.get('/portal/iam/proxy/invitations', async (request, reply) => {
    const session = requireIamSession(request, reply);
    const invitations = getInvitationsForUser(session.tenantId, session.userId);
    return { ok: true, invitations };
  });

  server.get('/portal/iam/proxy/invitations/for-patient', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!session.patientDfn) {
      reply.code(400).send({ ok: false, error: 'No patient profile linked' });
      return;
    }
    const invitations = getInvitationsForPatient(session.tenantId, session.patientDfn);
    return { ok: true, invitations };
  });

  server.post('/portal/iam/proxy/invitations/:id/respond', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { response } = body;

    if (response !== 'accepted' && response !== 'declined') {
      reply.code(400).send({ ok: false, error: "Response must be 'accepted' or 'declined'" });
      return;
    }

    const result = respondToInvitation(id, session.tenantId, response, session.userId);
    if (!result) {
      reply.code(404).send({ ok: false, error: 'Invitation not found or not pending' });
      return;
    }

    return { ok: true, invitation: result };
  });

  server.post('/portal/iam/proxy/invitations/:id/cancel', async (request, reply) => {
    const session = requireIamSession(request, reply);
    if (!validateCsrf(request, reply, session?.csrfSecret)) return;

    const { id } = request.params as { id: string };
    const ok = cancelInvitation(id, session.tenantId, session.userId);
    if (!ok) {
      reply.code(404).send({ ok: false, error: 'Invitation not found or not pending' });
      return;
    }

    return { ok: true };
  });

  /* ================================================================ */
  /* Access Log (Patient-Visible)                                      */
  /* ================================================================ */

  server.get('/portal/iam/activity', async (request, reply) => {
    const session = requireIamSession(request, reply);
    const query = request.query as any;

    const result = await getAccessLog(session.userId, {
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
      eventType: query.eventType || undefined,
      since: query.since || undefined,
    });

    return { ok: true, ...result };
  });

  /* ================================================================ */
  /* Admin Stats                                                       */
  /* ================================================================ */

  server.get('/portal/iam/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    return {
      ok: true,
      scope: 'platform-global',
      iam: getIamStats(),
      proxy: getProxyInvitationStats(),
      accessLog: await getAccessLogStats(),
    };
  });
}
