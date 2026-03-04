/**
 * SAML Broker Identity Provider -- Phase 66.
 *
 * Instead of parsing SAML assertions directly (fragile, security-sensitive),
 * we use a broker pattern:
 *
 *   User -> App -> Keycloak (OIDC) -> Keycloak (SAML IdP broker) -> Azure AD/Okta
 *
 * The app always speaks OIDC to the broker. The broker handles SAML upstream.
 * This gives us:
 *   - One protocol to implement (OIDC)
 *   - Full SAML support via broker configuration
 *   - No SAML XML parsing in application code
 *   - Broker handles SAML signature validation, assertion decryption, etc.
 *
 * Configuration:
 *   IDP_SAML_BROKER_ENABLED       -- "true" to enable
 *   IDP_SAML_BROKER_ISSUER        -- Broker OIDC issuer (Keycloak realm URL)
 *   IDP_SAML_BROKER_CLIENT_ID     -- Client ID in the broker
 *   IDP_SAML_BROKER_CLIENT_SECRET -- Client secret
 *   IDP_SAML_BROKER_IDP_ALIAS     -- SAML IdP alias in broker (e.g., "azure-ad")
 */

import { log } from '../../lib/logger.js';
import { validateJwt, type JwtValidationResult } from '../jwt-validator.js';
import { mapClaimsToUserMeta } from '../oidc-provider.js';
import { resolveTenantId } from '../../config/tenant-config.js';
import type { UserRole } from '../session-store.js';
import type {
  IdentityProvider,
  IdentityResult,
  CallbackParams,
  SamlBrokerConfig,
} from './types.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function loadConfig(): SamlBrokerConfig {
  return {
    type: 'saml-broker',
    enabled: process.env.IDP_SAML_BROKER_ENABLED === 'true',
    brokerIssuer:
      process.env.IDP_SAML_BROKER_ISSUER || 'http://localhost:8180/realms/vista-evolved',
    brokerClientId: process.env.IDP_SAML_BROKER_CLIENT_ID || 'vista-evolved-saml-broker',
    brokerClientSecret: process.env.IDP_SAML_BROKER_CLIENT_SECRET || '',
    samlIdpAlias: process.env.IDP_SAML_BROKER_IDP_ALIAS || '',
    scopes: (process.env.IDP_SAML_BROKER_SCOPES || 'openid profile email').split(' '),
  };
}

/* ------------------------------------------------------------------ */
/* Token Exchange (via broker OIDC endpoint)                           */
/* ------------------------------------------------------------------ */

async function exchangeCodeViaBroker(
  code: string,
  redirectUri: string,
  config: SamlBrokerConfig
): Promise<{ ok: true; idToken: string } | { ok: false; error: string }> {
  const tokenEndpoint = `${config.brokerIssuer}/protocol/openid-connect/token`;

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.brokerClientId,
      client_secret: config.brokerClientSecret,
    });

    const resp = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      log.warn('SAML broker token exchange failed', { status: resp.status });
      return { ok: false, error: `Broker token exchange failed: HTTP ${resp.status}` };
    }

    const tokens = (await resp.json()) as { id_token: string };
    return { ok: true, idToken: tokens.id_token };
  } catch (err: any) {
    log.warn('SAML broker token exchange error', { error: err.message });
    return { ok: false, error: `Broker token exchange error: ${err.message}` };
  }
}

/* ------------------------------------------------------------------ */
/* SAML Broker Identity Provider                                       */
/* ------------------------------------------------------------------ */

export class SamlBrokerIdentityProvider implements IdentityProvider {
  readonly type = 'saml-broker' as const;
  readonly displayName = 'SAML (via Broker)';

  private config: SamlBrokerConfig;

  constructor() {
    this.config = loadConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getAuthorizationUrl(state: string, nonce: string, redirectUri: string): string | null {
    if (!this.config.enabled) return null;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.brokerClientId,
      redirect_uri: redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      nonce,
    });

    // If a specific SAML IdP alias is configured, hint the broker to skip
    // its login page and redirect directly to the SAML IdP.
    if (this.config.samlIdpAlias) {
      params.set('kc_idp_hint', this.config.samlIdpAlias);
    }

    return `${this.config.brokerIssuer}/protocol/openid-connect/auth?${params.toString()}`;
  }

  async handleCallback(params: CallbackParams): Promise<IdentityResult> {
    if (!params.code) {
      return { ok: false, error: 'Missing authorization code from broker' };
    }
    // C2 FIX: mandatory state check when expectedState is set
    if (params.expectedState) {
      if (!params.state || params.state !== params.expectedState) {
        log.warn('SAML broker state mismatch', { sourceIp: params.sourceIp });
        return { ok: false, error: 'State mismatch -- possible CSRF attack' };
      }
    }

    // Exchange code via the broker's OIDC endpoint
    const tokenResult = await exchangeCodeViaBroker(
      params.code,
      params.redirectUri || '',
      this.config
    );
    if (!tokenResult.ok) {
      return { ok: false, error: tokenResult.error };
    }

    // Validate the broker-issued ID token
    const jwtResult: JwtValidationResult = await validateJwt(tokenResult.idToken);
    if (!jwtResult.valid || !jwtResult.claims) {
      log.warn('SAML broker ID token validation failed', { error: jwtResult.error });
      return { ok: false, error: `Broker ID token invalid: ${jwtResult.error}` };
    }

    // Validate nonce -- C3 FIX: mandatory when expectedNonce is set
    if (params.expectedNonce) {
      if (!jwtResult.claims.nonce || jwtResult.claims.nonce !== params.expectedNonce) {
        log.warn('SAML broker nonce mismatch');
        return { ok: false, error: 'Nonce mismatch -- possible replay attack' };
      }
    }

    // Map claims to identity
    const userMeta = mapClaimsToUserMeta(jwtResult.claims);
    let role: UserRole = 'provider';
    if (userMeta.roles.length > 0) {
      const roleSet = new Set(userMeta.roles.map((r) => r.toLowerCase()));
      if (roleSet.has('admin') || roleSet.has('system-admin')) role = 'admin';
      else if (roleSet.has('billing')) role = 'billing';
      else if (roleSet.has('pharmacist')) role = 'pharmacist';
      else if (roleSet.has('nurse')) role = 'nurse';
      else if (roleSet.has('provider') || roleSet.has('clinician')) role = 'provider';
      else if (roleSet.has('clerk')) role = 'clerk';
      else if (roleSet.has('support')) role = 'support';
    }

    const facilityStation = userMeta.facilityStation || '500';
    if (!userMeta.facilityStation) {
      log.warn('SAML broker claims missing facility_station, defaulting to 500 (sandbox)');
    }
    const tenantId = userMeta.tenantId || resolveTenantId(facilityStation);

    return {
      ok: true,
      identity: {
        sub: jwtResult.claims.sub,
        duz: userMeta.duz !== jwtResult.claims.sub ? userMeta.duz : undefined,
        displayName: userMeta.userName,
        email: jwtResult.claims.email,
        role,
        facilityStation,
        facilityName: '',
        divisionIen: '',
        tenantId,
        idpType: 'saml-broker',
        vistaSessionBound: false,
      },
    };
  }

  getLogoutUrl(idToken?: string, postLogoutRedirectUri?: string): string | null {
    if (!this.config.enabled) return null;

    const params = new URLSearchParams();
    if (idToken) params.set('id_token_hint', idToken);
    if (postLogoutRedirectUri) params.set('post_logout_redirect_uri', postLogoutRedirectUri);

    return `${this.config.brokerIssuer}/protocol/openid-connect/logout?${params.toString()}`;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    if (!this.config.enabled) {
      return { ok: true, detail: 'SAML broker disabled' };
    }
    try {
      const url = `${this.config.brokerIssuer}/.well-known/openid-configuration`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return {
        ok: resp.ok,
        detail: resp.ok ? 'broker discovery reachable' : `HTTP ${resp.status}`,
      };
    } catch (err: any) {
      return { ok: false, detail: err.message };
    }
  }
}
