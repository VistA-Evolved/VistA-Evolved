/**
 * OIDC Provider Configuration — Phase 35.
 *
 * Loads OpenID Connect configuration from a Keycloak (or any OIDC-compliant)
 * identity provider. Supports discovery via .well-known endpoint.
 *
 * Environment variables:
 *   OIDC_ISSUER      — Issuer URL (e.g., http://localhost:8180/realms/vista-evolved)
 *   OIDC_CLIENT_ID   — API client ID for audience validation
 *   OIDC_JWKS_URI    — JWKS endpoint (auto-discovered if not set)
 *   OIDC_AUDIENCE    — Expected audience claim (defaults to OIDC_CLIENT_ID)
 *   OIDC_ENABLED     — "true" to enable OIDC (default: "false" for backward compat)
 */

import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface OidcConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
  jwksUri: string;
  audience: string;
  /** Well-known discovery document (cached) */
  discovery?: OidcDiscovery;
}

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  grant_types_supported: string[];
  response_types_supported: string[];
  scopes_supported: string[];
}

export interface OidcTokenClaims {
  /** Subject (Keycloak user ID) */
  sub: string;
  /** Issuer */
  iss: string;
  /** Audience */
  aud: string | string[];
  /** Expiration (epoch seconds) */
  exp: number;
  /** Issued at (epoch seconds) */
  iat: number;
  /** VistA DUZ (custom claim) */
  duz?: string;
  /** User's display name */
  preferred_username?: string;
  /** Full name */
  name?: string;
  /** Email */
  email?: string;
  /** Realm roles */
  realm_roles?: string[];
  /** Facility station */
  facility_station?: string;
  /** Tenant ID */
  tenant_id?: string;
  /** Keycloak realm access (standard claim structure) */
  realm_access?: { roles: string[] };
  /** Any additional claims */
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

let cachedConfig: OidcConfig | null = null;

export function getOidcConfig(): OidcConfig {
  if (cachedConfig) return cachedConfig;

  const enabled = process.env.OIDC_ENABLED === "true";
  const issuer = process.env.OIDC_ISSUER || "http://localhost:8180/realms/vista-evolved";
  const clientId = process.env.OIDC_CLIENT_ID || "vista-evolved-api";
  const jwksUri = process.env.OIDC_JWKS_URI || `${issuer}/protocol/openid-connect/certs`;
  const audience = process.env.OIDC_AUDIENCE || clientId;

  cachedConfig = { enabled, issuer, clientId, jwksUri, audience };
  return cachedConfig;
}

/* ------------------------------------------------------------------ */
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

let discoveryCache: OidcDiscovery | null = null;
let discoveryFetchedAt = 0;
const DISCOVERY_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch the OIDC discovery document from the issuer's .well-known endpoint.
 * Cached for 5 minutes.
 */
export async function fetchDiscovery(): Promise<OidcDiscovery | null> {
  const config = getOidcConfig();
  if (!config.enabled) return null;

  const now = Date.now();
  if (discoveryCache && now - discoveryFetchedAt < DISCOVERY_TTL_MS) {
    return discoveryCache;
  }

  try {
    const url = `${config.issuer}/.well-known/openid-configuration`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      log.warn("OIDC discovery fetch failed", { status: resp.status, url });
      return discoveryCache; // Return stale cache if available
    }
    discoveryCache = (await resp.json()) as OidcDiscovery;
    discoveryFetchedAt = now;
    log.info("OIDC discovery refreshed", { issuer: discoveryCache.issuer });
    return discoveryCache;
  } catch (err: any) {
    log.warn("OIDC discovery fetch error", { error: err.message });
    return discoveryCache; // Return stale cache
  }
}

/**
 * Extract roles from OIDC token claims.
 * Supports both custom `realm_roles` claim and standard `realm_access.roles`.
 */
export function extractRolesFromClaims(claims: OidcTokenClaims): string[] {
  // Custom claim first (from our protocol mapper)
  if (Array.isArray(claims.realm_roles) && claims.realm_roles.length > 0) {
    return claims.realm_roles;
  }
  // Standard Keycloak realm_access structure
  if (claims.realm_access && Array.isArray(claims.realm_access.roles)) {
    return claims.realm_access.roles;
  }
  return [];
}

/**
 * Map OIDC claims to the session-compatible user metadata format.
 */
export function mapClaimsToUserMeta(claims: OidcTokenClaims): {
  duz: string;
  userName: string;
  roles: string[];
  facilityStation: string;
  tenantId: string;
} {
  const roles = extractRolesFromClaims(claims);
  return {
    duz: claims.duz || claims.sub,
    userName: claims.name || claims.preferred_username || claims.sub,
    roles,
    facilityStation: claims.facility_station || "",
    tenantId: claims.tenant_id || "default",
  };
}

/** Reset config cache (for testing). */
export function resetOidcConfig(): void {
  cachedConfig = null;
  discoveryCache = null;
  discoveryFetchedAt = 0;
}
