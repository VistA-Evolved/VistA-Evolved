/**
 * FHIR Bearer Token Authentication -- Phase 231 (Wave 5 Q231).
 *
 * Enables SMART-on-FHIR bearer token authentication for /fhir/* routes.
 * When OIDC is enabled, FHIR endpoints accept either:
 *   1. Session cookie (existing auth path)
 *   2. Bearer JWT token (SMART client auth path)
 *
 * The JWT is verified via JWKS from the configured OIDC issuer.
 * Scopes from the JWT are attached to the request for downstream enforcement (Q232).
 *
 * Security: iss, aud, exp, signature all validated via jwt-validator.ts.
 */

import type { FastifyRequest } from 'fastify';
import { getOidcConfig } from '../auth/oidc-provider.js';
import { validateJwt, type JwtValidationResult } from '../auth/jwt-validator.js';
import { log } from '../lib/logger.js';

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

export interface FhirPrincipal {
  /** Auth method used */
  authMethod: 'session' | 'bearer';
  /** User subject identifier (DUZ for session, sub for JWT) */
  sub: string;
  /** VistA DUZ (from session or JWT claim) */
  duz: string;
  /** User display name */
  userName: string;
  /** User roles */
  roles: string[];
  /** SMART scopes from JWT (empty for session auth) */
  scopes: string[];
  /** Tenant ID */
  tenantId: string;
  /** Patient context from launch scope (if any) */
  patientContext?: string;
}

/* ================================================================== */
/* Request augmentation                                                 */
/* ================================================================== */

declare module 'fastify' {
  interface FastifyRequest {
    /** FHIR principal -- set by fhir auth middleware for /fhir/* routes */
    fhirPrincipal?: FhirPrincipal;
  }
}

/* ================================================================== */
/* Bearer token extraction + validation                                 */
/* ================================================================== */

/**
 * Extract Bearer token from Authorization header.
 * Returns null if no Bearer token present.
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

/**
 * Validate a Bearer JWT token for FHIR access.
 *
 * Returns a FhirPrincipal if the token is valid, or an error string.
 * This delegates to jwt-validator.ts for full cryptographic validation.
 */
export async function validateFhirBearerToken(
  token: string
): Promise<{ ok: true; principal: FhirPrincipal } | { ok: false; error: string }> {
  const config = getOidcConfig();
  if (!config.enabled) {
    return { ok: false, error: 'OIDC is not enabled; bearer tokens not accepted' };
  }

  // Full JWT validation (signature + iss + aud + exp)
  const result: JwtValidationResult = await validateJwt(token);
  if (!result.valid || !result.claims) {
    return { ok: false, error: result.error || 'Invalid token' };
  }

  const claims = result.claims;

  // Extract SMART scopes from the "scope" claim (space-separated string)
  const scopeStr = typeof claims.scope === 'string' ? claims.scope : '';
  const scopes = scopeStr.split(/\s+/).filter(Boolean);

  // Extract roles
  let roles: string[] = [];
  if (Array.isArray(claims.realm_roles)) {
    roles = claims.realm_roles;
  } else if (claims.realm_access?.roles) {
    roles = claims.realm_access.roles;
  }

  // Extract patient context from launch context (SMART EHR launch)
  const patientContext = typeof claims.patient === 'string' ? claims.patient : undefined;
  const tenantId =
    typeof claims.tenant_id === 'string' && claims.tenant_id.trim().length > 0
      ? claims.tenant_id.trim()
      : null;
  if (!tenantId) {
    return { ok: false, error: 'FHIR bearer token missing tenant_id claim' };
  }

  const principal: FhirPrincipal = {
    authMethod: 'bearer',
    sub: claims.sub,
    duz: (claims.duz as string) || claims.sub,
    userName: (claims.name as string) || (claims.preferred_username as string) || claims.sub,
    roles,
    scopes,
    tenantId,
    patientContext,
  };

  log.debug('FHIR bearer token validated', {
    sub: principal.sub,
    scopes: scopes.length,
    patientCtx: !!patientContext,
  });

  return { ok: true, principal };
}

/**
 * Build a FhirPrincipal from an existing session.
 * Used when the FHIR request was authenticated via session cookie.
 */
export function principalFromSession(session: {
  duz: string;
  userName: string;
  role: string;
  tenantId?: string;
}): FhirPrincipal {
  return {
    authMethod: 'session',
    sub: session.duz,
    duz: session.duz,
    userName: session.userName,
    roles: [session.role],
    scopes: ['user/*.read'], // Session users get full user-level read access
    tenantId: session.tenantId || '',
  };
}
