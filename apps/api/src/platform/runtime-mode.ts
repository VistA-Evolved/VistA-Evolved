/**
 * Runtime Mode — Phase 125: Postgres-Only Production Data Plane
 *
 * Single source of truth for the deployment runtime mode.
 *
 * PLATFORM_RUNTIME_MODE env var controls behaviour:
 *   "dev"  (default) — PG optional, RLS optional
 *   "test" — Same as dev (CI unit tests)
 *   "rc"   — PG required, RLS auto-enabled
 *   "prod" — PG required, RLS auto-enabled
 *
 * rc/prod modes enforce:
 *   - PLATFORM_PG_URL must be set
 *   - STORE_BACKEND must resolve to "pg"
 *   - RLS policies applied automatically
 *   - JSON mutable file stores disabled
 */

export type RuntimeMode = 'dev' | 'test' | 'rc' | 'prod';

const VALID_MODES: readonly RuntimeMode[] = ['dev', 'test', 'rc', 'prod'] as const;

let cachedMode: RuntimeMode | null = null;

/**
 * Resolve the current runtime mode from PLATFORM_RUNTIME_MODE env var.
 * Defaults to "dev" if unset or invalid.
 */
export function getRuntimeMode(): RuntimeMode {
  if (cachedMode) return cachedMode;

  const raw = (process.env.PLATFORM_RUNTIME_MODE || 'dev').toLowerCase().trim();

  if (VALID_MODES.includes(raw as RuntimeMode)) {
    cachedMode = raw as RuntimeMode;
  } else {
    // Fallback: map NODE_ENV to runtime mode for backwards compat
    if (process.env.NODE_ENV === 'production') {
      cachedMode = 'prod';
    } else if (process.env.NODE_ENV === 'test') {
      cachedMode = 'test';
    } else {
      cachedMode = 'dev';
    }
  }

  return cachedMode;
}

/** True when runtime mode requires Postgres (rc or prod). */
export function requiresPg(): boolean {
  const mode = getRuntimeMode();
  return mode === 'rc' || mode === 'prod';
}

/** True when RLS should be auto-enabled (rc or prod). */
export function requiresRls(): boolean {
  return requiresPg();
}

/** True when JSON mutable file stores are blocked (rc or prod). */
export function blocksJsonStores(): boolean {
  return requiresPg();
}

/** True when OIDC must be enabled (rc or prod). Phase 150. */
export function requiresOidc(): boolean {
  return requiresPg();
}

/**
 * Validate that the current environment satisfies the runtime mode contract.
 * Throws if rc/prod mode is set but PG is not configured.
 * Call this early in server startup.
 */
export function validateRuntimeMode(): void {
  const mode = getRuntimeMode();

  if (requiresPg()) {
    const pgUrl = process.env.PLATFORM_PG_URL || process.env.PLATFORM_PG_HOST;
    if (!pgUrl) {
      throw new Error(
        `PLATFORM_RUNTIME_MODE=${mode} requires PostgreSQL. ` +
          `Set PLATFORM_PG_URL or PLATFORM_PG_HOST. ` +
          `Use PLATFORM_RUNTIME_MODE=dev for local development without PG.`
      );
    }
  }

  // Phase 150: OIDC is mandatory in rc/prod
  if (requiresOidc()) {
    const oidcEnabled = (process.env.OIDC_ENABLED || '').toLowerCase().trim();
    if (oidcEnabled !== 'true') {
      throw new Error(
        `PLATFORM_RUNTIME_MODE=${mode} requires OIDC. ` +
          `Set OIDC_ENABLED=true and OIDC_ISSUER to your IdP issuer URL. ` +
          `Use PLATFORM_RUNTIME_MODE=dev for VistA-only local development.`
      );
    }
    const oidcIssuer = process.env.OIDC_ISSUER;
    if (!oidcIssuer) {
      throw new Error(
        `PLATFORM_RUNTIME_MODE=${mode} requires OIDC_ISSUER to be set. ` +
          `Point it at your Keycloak (or OIDC-compliant) issuer URL.`
      );
    }
  }
}

/** Reset cached mode (for testing only). */
export function _resetCachedMode(): void {
  cachedMode = null;
}
