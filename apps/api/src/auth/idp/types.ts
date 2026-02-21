/**
 * Identity Provider Interface -- Phase 66.
 *
 * Defines the contract for pluggable identity providers (OIDC, SAML broker,
 * VistA direct). All providers produce a canonical IdentityResult that maps
 * cleanly to our SessionData.
 *
 * Key design decisions:
 *   1. VistA security remains primary for *clinical actions* -- the IdP layer
 *      handles identity + RBAC, not VistA RPC authorization.
 *   2. SAML is supported via broker (Keycloak/AzureAD/Okta) -- we accept
 *      OIDC tokens from the broker, never parse SAML assertions directly.
 *   3. All providers produce the same IdentityResult shape.
 */

import type { UserRole } from "../session-store.js";

/* ------------------------------------------------------------------ */
/* Identity Result (canonical output from any IdP)                     */
/* ------------------------------------------------------------------ */

export interface IdentityResult {
  /** Whether authentication succeeded */
  ok: boolean;
  /** Error message on failure */
  error?: string;
  /** Authenticated user identity */
  identity?: {
    /** External subject ID (IdP-issued) */
    sub: string;
    /** VistA DUZ (if known -- may be set during VistA binding) */
    duz?: string;
    /** Display name */
    displayName: string;
    /** Email (optional) */
    email?: string;
    /** Mapped application role */
    role: UserRole;
    /** Facility station number */
    facilityStation: string;
    /** Facility name */
    facilityName: string;
    /** Division IEN (if known) */
    divisionIen: string;
    /** Resolved tenant ID */
    tenantId: string;
    /** Identity provider type */
    idpType: IdpType;
    /** Whether VistA session binding is complete */
    vistaSessionBound: boolean;
    /** Raw IdP claims (for audit, never logged in full) */
    rawClaims?: Record<string, unknown>;
  };
}

/* ------------------------------------------------------------------ */
/* IdP Types                                                           */
/* ------------------------------------------------------------------ */

export type IdpType = "vista" | "oidc" | "saml-broker";

/* ------------------------------------------------------------------ */
/* Provider Interface                                                  */
/* ------------------------------------------------------------------ */

export interface IdentityProvider {
  /** Provider type identifier */
  readonly type: IdpType;

  /** Human-readable name (for config UI) */
  readonly displayName: string;

  /** Whether this provider is currently enabled */
  isEnabled(): boolean;

  /**
   * Get the authorization URL to redirect the user to.
   * For VistA direct auth, returns null (no redirect needed).
   */
  getAuthorizationUrl(state: string, nonce: string, redirectUri: string): string | null;

  /**
   * Handle the callback from the IdP after user authenticates.
   * For VistA direct, this is the access/verify code exchange.
   * For OIDC/SAML-broker, this is the authorization code exchange.
   */
  handleCallback(params: CallbackParams): Promise<IdentityResult>;

  /**
   * Get the IdP logout URL (for single-sign-out).
   * Returns null if the IdP doesn't support front-channel logout.
   */
  getLogoutUrl(idToken?: string, postLogoutRedirectUri?: string): string | null;

  /**
   * Health check -- can this provider reach its upstream?
   */
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

/* ------------------------------------------------------------------ */
/* Callback Params                                                     */
/* ------------------------------------------------------------------ */

export interface CallbackParams {
  /** Authorization code (OIDC/SAML broker) */
  code?: string;
  /** State parameter for CSRF verification */
  state?: string;
  /** Expected state (from session) */
  expectedState?: string;
  /** Nonce for replay protection */
  nonce?: string;
  /** Expected nonce (from session) */
  expectedNonce?: string;
  /** Redirect URI used in the auth request */
  redirectUri?: string;
  /** VistA access code (vista direct only) */
  accessCode?: string;
  /** VistA verify code (vista direct only) */
  verifyCode?: string;
  /** Source IP for audit */
  sourceIp?: string;
}

/* ------------------------------------------------------------------ */
/* VistA Session Binding                                               */
/* ------------------------------------------------------------------ */

export interface VistaBindingResult {
  /** Whether VistA binding succeeded */
  ok: boolean;
  /** Error message */
  error?: string;
  /** VistA DUZ (on success) */
  duz?: string;
  /** User name from VistA */
  userName?: string;
  /** Facility info from VistA */
  facilityStation?: string;
  facilityName?: string;
  divisionIen?: string;
}

/**
 * VistA Session Binding Status.
 * When app auth is via OIDC/SAML, clinical actions still require a VistA
 * RPC session. This status tracks whether that binding is complete.
 */
export type VistaBindingStatus = "not-required" | "pending" | "bound" | "failed";

/* ------------------------------------------------------------------ */
/* Provider Configuration                                              */
/* ------------------------------------------------------------------ */

export interface OidcIdpConfig {
  type: "oidc";
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  jwksUri?: string;
  audience?: string;
  scopes: string[];
  /** Custom claim mappings */
  claimMappings?: {
    duz?: string;
    role?: string;
    facilityStation?: string;
    tenantId?: string;
  };
}

export interface SamlBrokerConfig {
  type: "saml-broker";
  enabled: boolean;
  /** The OIDC issuer of the broker (e.g., Keycloak) that handles SAML upstream */
  brokerIssuer: string;
  brokerClientId: string;
  brokerClientSecret: string;
  /** The SAML IdP alias in the broker (e.g., "azure-ad", "okta") */
  samlIdpAlias?: string;
  scopes: string[];
}

export interface VistaDirectConfig {
  type: "vista";
  enabled: boolean;
  /** VistA host for RPC broker */
  vistaHost: string;
  vistaPort: number;
}
