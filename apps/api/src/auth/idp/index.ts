/**
 * Identity Provider Registry -- Phase 66.
 *
 * Central registry for all identity providers. Resolves the active
 * provider(s) and provides health status.
 *
 * Provider priority (first enabled wins for default):
 *   1. OIDC (direct OIDC provider)
 *   2. SAML Broker (SAML via Keycloak/broker)
 *   3. VistA Direct (fallback -- always available for sandbox)
 *
 * Multiple providers can be enabled simultaneously. The "default" provider
 * is used when no explicit IdP type is requested.
 */

import { log } from '../../lib/logger.js';
import { OidcIdentityProvider } from './oidc-idp.js';
import { SamlBrokerIdentityProvider } from './saml-broker-idp.js';
import type { IdentityProvider, IdpType } from './types.js';

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const providers = new Map<IdpType, IdentityProvider>();
let initialized = false;

/**
 * Initialize all identity providers.
 * Call once at startup from index.ts.
 */
export function initIdentityProviders(): void {
  if (initialized) return;

  const oidc = new OidcIdentityProvider();
  const samlBroker = new SamlBrokerIdentityProvider();

  providers.set('oidc', oidc);
  providers.set('saml-broker', samlBroker);

  const enabledList = Array.from(providers.entries())
    .filter(([, p]) => p.isEnabled())
    .map(([t]) => t);

  log.info('Identity providers initialized', {
    registered: Array.from(providers.keys()),
    enabled: enabledList,
  });

  initialized = true;
}

/**
 * Get a specific identity provider by type.
 */
export function getProvider(type: IdpType): IdentityProvider | null {
  return providers.get(type) || null;
}

/**
 * Get the default (highest priority enabled) provider.
 * Returns null if only VistA direct is available (handled by existing auth routes).
 */
export function getDefaultProvider(): IdentityProvider | null {
  // Priority order
  const priority: IdpType[] = ['oidc', 'saml-broker'];
  for (const type of priority) {
    const provider = providers.get(type);
    if (provider?.isEnabled()) return provider;
  }
  return null;
}

/**
 * Get all registered providers with their status.
 */
export function listProviders(): Array<{
  type: IdpType;
  displayName: string;
  enabled: boolean;
}> {
  return Array.from(providers.entries()).map(([type, provider]) => ({
    type,
    displayName: provider.displayName,
    enabled: provider.isEnabled(),
  }));
}

/**
 * Health check all providers.
 */
export async function checkAllProviderHealth(): Promise<
  Array<{ type: IdpType; ok: boolean; detail?: string }>
> {
  const results: Array<{ type: IdpType; ok: boolean; detail?: string }> = [];

  for (const [type, provider] of providers) {
    try {
      const health = await provider.healthCheck();
      results.push({ type, ...health });
    } catch (err: any) {
      results.push({ type, ok: false, detail: err.message });
    }
  }

  // Always include VistA direct status
  results.push({
    type: 'vista',
    ok: true,
    detail: 'VistA direct auth always available via POST /auth/login',
  });

  return results;
}

// Re-export types for convenience
export type { IdentityProvider, IdpType, IdentityResult, CallbackParams } from './types.js';
