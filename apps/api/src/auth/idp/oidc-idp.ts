/**
 * OIDC Identity Provider -- Phase 66.
 *
 * Implements the IdentityProvider interface for OpenID Connect providers.
 * Handles the full authorization code flow:
 *   1. Generate authorization URL with PKCE (state + nonce)
 *   2. Exchange authorization code for tokens
 *   3. Validate ID token (JWT) and extract claims
 *   4. Map claims to IdentityResult
 *
 * Works with any OIDC-compliant provider: Keycloak, Azure AD, Okta, Auth0.
 *
 * Environment variables:
 *   IDP_OIDC_ENABLED       -- "true" to enable
 *   IDP_OIDC_ISSUER        -- Issuer URL
 *   IDP_OIDC_CLIENT_ID     -- Client ID
 *   IDP_OIDC_CLIENT_SECRET -- Client secret (keep in .env.local)
 *   IDP_OIDC_SCOPES        -- Space-separated scopes (default: "openid profile email")
 */

import { createHash } from "crypto";
import { log } from "../../lib/logger.js";
import { validateJwt, type JwtValidationResult } from "../jwt-validator.js";
import { getOidcConfig, mapClaimsToUserMeta, type OidcTokenClaims } from "../oidc-provider.js";
import { mapUserRole, type UserRole } from "../session-store.js";
import { resolveTenantId } from "../../config/tenant-config.js";
import type {
  IdentityProvider,
  IdentityResult,
  CallbackParams,
  OidcIdpConfig,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function loadConfig(): OidcIdpConfig {
  return {
    type: "oidc",
    enabled: process.env.IDP_OIDC_ENABLED === "true",
    issuer: process.env.IDP_OIDC_ISSUER || process.env.OIDC_ISSUER || "http://localhost:8180/realms/vista-evolved",
    clientId: process.env.IDP_OIDC_CLIENT_ID || process.env.OIDC_CLIENT_ID || "vista-evolved-api",
    clientSecret: process.env.IDP_OIDC_CLIENT_SECRET || "",
    scopes: (process.env.IDP_OIDC_SCOPES || "openid profile email").split(" "),
    claimMappings: {
      duz: process.env.IDP_OIDC_CLAIM_DUZ || "duz",
      role: process.env.IDP_OIDC_CLAIM_ROLE || "realm_roles",
      facilityStation: process.env.IDP_OIDC_CLAIM_FACILITY || "facility_station",
      tenantId: process.env.IDP_OIDC_CLAIM_TENANT || "tenant_id",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Token Exchange                                                      */
/* ------------------------------------------------------------------ */

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Exchange authorization code for tokens at the IdP's token endpoint.
 */
async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  config: OidcIdpConfig,
): Promise<{ ok: true; tokens: TokenResponse } | { ok: false; error: string }> {
  const tokenEndpoint = `${config.issuer}/protocol/openid-connect/token`;

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const resp = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      log.warn("OIDC token exchange failed", { status: resp.status });
      return { ok: false, error: `Token exchange failed: HTTP ${resp.status}` };
    }

    const tokens = (await resp.json()) as TokenResponse;
    return { ok: true, tokens };
  } catch (err: any) {
    log.warn("OIDC token exchange error", { error: err.message });
    return { ok: false, error: `Token exchange error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/* Claim Mapping                                                       */
/* ------------------------------------------------------------------ */

function mapClaimsToIdentity(
  claims: OidcTokenClaims,
  config: OidcIdpConfig,
): IdentityResult {
  const userMeta = mapClaimsToUserMeta(claims);

  // Map IdP roles to our UserRole
  let role: UserRole = "provider"; // default
  if (userMeta.roles.length > 0) {
    // Priority: admin > billing > pharmacist > nurse > provider > clerk
    const roleSet = new Set(userMeta.roles.map((r) => r.toLowerCase()));
    if (roleSet.has("admin") || roleSet.has("system-admin")) role = "admin";
    else if (roleSet.has("billing") || roleSet.has("rcm-user")) role = "billing";
    else if (roleSet.has("pharmacist")) role = "pharmacist";
    else if (roleSet.has("nurse")) role = "nurse";
    else if (roleSet.has("provider") || roleSet.has("clinician")) role = "provider";
    else if (roleSet.has("clerk")) role = "clerk";
    else if (roleSet.has("support") || roleSet.has("helpdesk")) role = "support";
  }

  const facilityStation = userMeta.facilityStation || "500";
  const tenantId = userMeta.tenantId || resolveTenantId(facilityStation);

  return {
    ok: true,
    identity: {
      sub: claims.sub,
      duz: userMeta.duz !== claims.sub ? userMeta.duz : undefined,
      displayName: userMeta.userName,
      email: claims.email,
      role,
      facilityStation,
      facilityName: "",
      divisionIen: "",
      tenantId,
      idpType: "oidc",
      vistaSessionBound: false,
    },
  };
}

/* ------------------------------------------------------------------ */
/* OIDC Identity Provider                                              */
/* ------------------------------------------------------------------ */

export class OidcIdentityProvider implements IdentityProvider {
  readonly type = "oidc" as const;
  readonly displayName = "OpenID Connect";

  private config: OidcIdpConfig;

  constructor() {
    this.config = loadConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getAuthorizationUrl(state: string, nonce: string, redirectUri: string): string | null {
    if (!this.config.enabled) return null;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(" "),
      state,
      nonce,
    });

    return `${this.config.issuer}/protocol/openid-connect/auth?${params.toString()}`;
  }

  async handleCallback(params: CallbackParams): Promise<IdentityResult> {
    // Validate state (CSRF protection)
    if (!params.code) {
      return { ok: false, error: "Missing authorization code" };
    }
    if (params.state && params.expectedState && params.state !== params.expectedState) {
      log.warn("OIDC callback state mismatch", { sourceIp: params.sourceIp });
      return { ok: false, error: "State mismatch -- possible CSRF attack" };
    }

    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(
      params.code,
      params.redirectUri || "",
      this.config,
    );
    if (!tokenResult.ok) {
      return { ok: false, error: tokenResult.error };
    }

    // Validate ID token
    const jwtResult: JwtValidationResult = await validateJwt(tokenResult.tokens.id_token);
    if (!jwtResult.valid || !jwtResult.claims) {
      log.warn("OIDC ID token validation failed", { error: jwtResult.error });
      return { ok: false, error: `ID token validation failed: ${jwtResult.error}` };
    }

    // Validate nonce
    if (params.expectedNonce && jwtResult.claims.nonce !== params.expectedNonce) {
      log.warn("OIDC nonce mismatch");
      return { ok: false, error: "Nonce mismatch -- possible replay attack" };
    }

    // Map claims to identity
    return mapClaimsToIdentity(jwtResult.claims, this.config);
  }

  getLogoutUrl(idToken?: string, postLogoutRedirectUri?: string): string | null {
    if (!this.config.enabled) return null;

    const params = new URLSearchParams();
    if (idToken) params.set("id_token_hint", idToken);
    if (postLogoutRedirectUri) params.set("post_logout_redirect_uri", postLogoutRedirectUri);

    return `${this.config.issuer}/protocol/openid-connect/logout?${params.toString()}`;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    if (!this.config.enabled) {
      return { ok: true, detail: "OIDC disabled" };
    }
    try {
      const url = `${this.config.issuer}/.well-known/openid-configuration`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { ok: resp.ok, detail: resp.ok ? "discovery reachable" : `HTTP ${resp.status}` };
    } catch (err: any) {
      return { ok: false, detail: err.message };
    }
  }
}
