/**
 * Identity Provider Routes -- Phase 66.
 *
 * Endpoints for OIDC/SAML authentication flows and VistA session binding.
 *
 * Routes:
 *   GET  /auth/idp/providers          -- List available identity providers
 *   GET  /auth/idp/authorize/:type    -- Redirect to IdP authorization
 *   GET  /auth/idp/callback/:type     -- Handle IdP callback (code exchange)
 *   POST /auth/idp/vista-bind         -- Bind VistA session to current session
 *   GET  /auth/idp/vista-status       -- Check VistA binding status
 *   GET  /auth/idp/health             -- IdP subsystem health
 *
 * Security:
 *   - State parameter for CSRF protection on OIDC/SAML flows
 *   - Nonce for replay protection
 *   - No tokens in query strings (code is one-time-use)
 *   - All auth events audited (no secrets logged)
 *   - Rate-limited auth endpoints
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes } from 'crypto';
import {
  initIdentityProviders,
  getProvider,
  listProviders,
  checkAllProviderHealth,
} from './index.js';
import { bindVistaSession, getVistaBindingStatus, getVistaBinding } from './vista-binding.js';
import { createSession, getSession, rotateSession } from '../session-store.js';
import { SESSION_CONFIG } from '../../config/server-config.js';
import { log } from '../../lib/logger.js';
import { audit } from '../../lib/audit.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { getPermissionsForRole } from '../rbac.js';
import type { IdpType, CallbackParams } from './types.js';

/* ------------------------------------------------------------------ */
/* Auth state store (short-lived, for CSRF + nonce)                    */
/* ------------------------------------------------------------------ */

interface AuthState {
  state: string;
  nonce: string;
  idpType: IdpType;
  redirectUri: string;
  createdAt: number;
}

/** In-memory store for pending auth requests. Max 5-min TTL. */
const pendingAuthStates = new Map<string, AuthState>();
const AUTH_STATE_TTL_MS = 5 * 60 * 1000;

// Cleanup expired states every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pendingAuthStates) {
    if (now - entry.createdAt > AUTH_STATE_TTL_MS) {
      pendingAuthStates.delete(key);
    }
  }
}, 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* Cookie helpers                                                      */
/* ------------------------------------------------------------------ */

const COOKIE_NAME = SESSION_CONFIG.cookieName;
const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure:
    process.env.NODE_ENV === 'production' ||
    ['rc', 'prod'].includes((process.env.PLATFORM_RUNTIME_MODE || '').toLowerCase().trim()),
  maxAge: Math.floor(SESSION_CONFIG.absoluteTtlMs / 1000),
};

function extractToken(request: FastifyRequest): string | null {
  const cookie = (request as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export default async function idpRoutes(server: FastifyInstance): Promise<void> {
  // Ensure providers are initialized
  initIdentityProviders();

  /**
   * GET /auth/idp/providers
   * List all available identity providers and their status.
   */
  server.get('/auth/idp/providers', async () => {
    const providers = listProviders();
    return {
      ok: true,
      providers,
      vistaDirectAvailable: true,
      note: 'VistA direct auth is always available via POST /auth/login',
    };
  });

  /**
   * GET /auth/idp/authorize/:type
   * Start the OIDC/SAML authorization flow by redirecting to the IdP.
   */
  server.get('/auth/idp/authorize/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.params as { type: string };
    const idpType = type as IdpType;

    if (idpType !== 'oidc' && idpType !== 'saml-broker') {
      return reply.code(400).send({
        ok: false,
        error: `Invalid IdP type: ${type}. Use 'oidc' or 'saml-broker'.`,
      });
    }

    const provider = getProvider(idpType);
    if (!provider || !provider.isEnabled()) {
      return reply.code(404).send({
        ok: false,
        error: `IdP '${type}' is not enabled. Configure IDP_${type.toUpperCase().replace('-', '_')}_ENABLED=true.`,
      });
    }

    // Generate state + nonce
    const state = randomBytes(32).toString('hex');
    const nonce = randomBytes(16).toString('hex');

    // C1 FIX: Never accept redirect_uri from query params (open redirect attack vector).
    // Always derive callback URL from the server's own origin.
    const redirectUri = `${request.protocol}://${request.hostname}/auth/idp/callback/${type}`;

    // Store state for validation on callback
    pendingAuthStates.set(state, {
      state,
      nonce,
      idpType,
      redirectUri,
      createdAt: Date.now(),
    });

    const authUrl = provider.getAuthorizationUrl(state, nonce, redirectUri);
    if (!authUrl) {
      return reply
        .code(500)
        .send({ ok: false, error: 'Provider could not generate authorization URL' });
    }

    // Audit the auth initiation (no secrets)
    audit(
      'auth.idp.authorize',
      'success',
      { duz: 'anonymous' },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { idpType, state: state.substring(0, 8) + '...' },
      }
    );

    return reply.redirect(authUrl);
  });

  /**
   * GET /auth/idp/callback/:type
   * Handle the callback from the IdP after user authenticates.
   * Exchanges authorization code for tokens, validates, creates session.
   */
  server.get('/auth/idp/callback/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.params as { type: string };
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };

    // Handle IdP-reported errors
    if (query.error) {
      // W6 FIX: Log full error_description server-side, return only generic message to client
      log.warn('IdP callback error', {
        type,
        error: query.error,
        description: query.error_description,
      });
      audit(
        'auth.idp.callback',
        'failure',
        { duz: 'anonymous' },
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { idpType: type, error: query.error },
        }
      );
      return reply.code(400).send({
        ok: false,
        error: 'Authentication failed at identity provider',
      });
    }

    if (!query.code || !query.state) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing code or state parameter in callback',
      });
    }

    // Retrieve and validate state
    const pendingState = pendingAuthStates.get(query.state);
    if (!pendingState) {
      log.warn('IdP callback with unknown state', { type, sourceIp: request.ip });
      return reply.code(400).send({
        ok: false,
        error: 'Invalid or expired state parameter',
      });
    }

    // Clean up state (one-time use)
    pendingAuthStates.delete(query.state);

    // Check state age
    if (Date.now() - pendingState.createdAt > AUTH_STATE_TTL_MS) {
      return reply.code(400).send({ ok: false, error: 'Auth state expired' });
    }

    // Get provider
    const provider = getProvider(pendingState.idpType);
    if (!provider) {
      return reply.code(500).send({ ok: false, error: 'Provider not found' });
    }

    // Exchange code and validate token
    const callbackParams: CallbackParams = {
      code: query.code,
      state: query.state,
      expectedState: pendingState.state,
      nonce: pendingState.nonce,
      expectedNonce: pendingState.nonce,
      redirectUri: pendingState.redirectUri,
      sourceIp: request.ip,
    };

    const result = await provider.handleCallback(callbackParams);

    if (!result.ok || !result.identity) {
      log.warn('IdP callback authentication failed', { type, error: result.error });
      audit(
        'auth.idp.callback',
        'failure',
        { duz: 'anonymous' },
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { idpType: type, error: result.error },
        }
      );
      immutableAudit(
        'auth.idp.failed',
        'failure',
        {
          sub: 'anonymous',
          name: 'anonymous',
          roles: [],
        },
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { idpType: type, error: 'authentication-failed' },
        }
      );
      return reply.code(401).send({ ok: false, error: result.error });
    }

    // Create session from IdP identity
    const identity = result.identity;
    const token = await createSession({
      duz: identity.duz || identity.sub,
      userName: identity.displayName,
      role: identity.role,
      facilityStation: identity.facilityStation,
      facilityName: identity.facilityName,
      divisionIen: identity.divisionIen,
      tenantId: identity.tenantId,
    });

    // Rotate token to prevent fixation
    const finalToken = SESSION_CONFIG.rotateOnLogin
      ? ((await rotateSession(token)) ?? token)
      : token;

    // Set session cookie (httpOnly -- no JS access)
    reply.setCookie(COOKIE_NAME, finalToken, COOKIE_OPTS);

    // Phase 132: CSRF token is now session-bound (synchronizer pattern).
    // Delivered via GET /auth/session or GET /auth/csrf-token after redirect.
    // No more double-submit cookie for IDP callback.

    // Audit successful IdP login
    audit(
      'auth.idp.login',
      'success',
      {
        duz: identity.duz || identity.sub,
        name: identity.displayName,
        role: identity.role,
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { idpType: identity.idpType, tenantId: identity.tenantId },
      }
    );

    immutableAudit(
      'auth.idp.login',
      'success',
      {
        sub: identity.sub,
        name: identity.displayName,
        roles: [identity.role],
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        tenantId: identity.tenantId,
      }
    );

    log.info('User authenticated via IdP', { idpType: identity.idpType, role: identity.role });

    // Redirect to app (or return JSON for API clients)
    const acceptsJson = request.headers.accept?.includes('application/json');
    if (acceptsJson) {
      return {
        ok: true,
        session: {
          duz: identity.duz || identity.sub,
          userName: identity.displayName,
          role: identity.role,
          facilityStation: identity.facilityStation,
          tenantId: identity.tenantId,
          idpType: identity.idpType,
          vistaSessionBound: identity.vistaSessionBound,
          permissions: getPermissionsForRole(identity.role),
        },
      };
    }

    // HTML redirect for browser-based flows
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return reply.redirect(`${appUrl}/cprs?idp_login=success`);
  });

  /**
   * POST /auth/idp/vista-bind
   * Bind a VistA RPC session to the current app session.
   * Required for clinical VistA actions when authenticated via OIDC/SAML.
   */
  server.post('/auth/idp/vista-bind', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    const session = await getSession(token);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Session expired' });
    }

    const body = (request.body as any) || {};
    const { accessCode, verifyCode } = body;

    if (!accessCode || !verifyCode) {
      return reply.code(400).send({
        ok: false,
        error: 'accessCode and verifyCode required for VistA binding',
      });
    }

    const bindResult = await bindVistaSession(token, accessCode, verifyCode, {
      tenantId: session.tenantId,
    });

    if (!bindResult.ok) {
      audit(
        'auth.vista-bind',
        'failure',
        {
          duz: session.duz,
          name: session.userName,
          role: session.role,
        },
        {
          requestId: (request as any).requestId,
          sourceIp: request.ip,
          detail: { error: 'vista-bind-failed' },
        }
      );
      return reply.code(401).send({ ok: false, error: bindResult.error });
    }

    // Update session with VistA info
    // Note: session is in-memory, so we can mutate directly
    if (bindResult.duz) session.duz = bindResult.duz;
    if (bindResult.userName) session.userName = bindResult.userName;
    if (bindResult.facilityStation) session.facilityStation = bindResult.facilityStation;
    if (bindResult.facilityName) session.facilityName = bindResult.facilityName;
    if (bindResult.divisionIen) session.divisionIen = bindResult.divisionIen;

    audit(
      'auth.vista-bind',
      'success',
      {
        duz: session.duz,
        name: session.userName,
        role: session.role,
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { vistaBinding: 'bound' },
      }
    );

    immutableAudit(
      'auth.vista-bind',
      'success',
      {
        sub: session.duz,
        name: session.userName,
        roles: [session.role],
      },
      {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        tenantId: session.tenantId,
      }
    );

    return {
      ok: true,
      vistaBinding: {
        duz: bindResult.duz,
        userName: bindResult.userName,
        facilityStation: bindResult.facilityStation,
        status: 'bound',
      },
    };
  });

  /**
   * GET /auth/idp/vista-status
   * Check VistA session binding status for the current session.
   */
  server.get('/auth/idp/vista-status', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractToken(request);
    if (!token) {
      return reply.code(401).send({ ok: false, error: 'Not authenticated' });
    }
    const session = await getSession(token);
    if (!session) {
      return reply.code(401).send({ ok: false, error: 'Session expired' });
    }

    const binding = getVistaBinding(token);
    const status = getVistaBindingStatus(token);

    return {
      ok: true,
      vistaBinding: {
        status,
        duz: binding?.duz,
        userName: binding?.userName,
        facilityStation: binding?.facilityStation,
        boundAt: binding?.boundAt,
      },
      note:
        status === 'pending'
          ? 'VistA session binding required for clinical actions. POST /auth/idp/vista-bind with accessCode + verifyCode.'
          : undefined,
      pendingTargets: status === 'pending' ? ['XUS AV CODE', 'XWB CREATE CONTEXT'] : undefined,
    };
  });

  /**
   * GET /auth/idp/health
   * Health check for all identity providers.
   */
  server.get('/auth/idp/health', async () => {
    const providerHealth = await checkAllProviderHealth();
    const allOk = providerHealth.every((p) => p.ok);
    return {
      ok: allOk,
      providers: providerHealth,
    };
  });
}
