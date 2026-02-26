/**
 * Auth Mode Policy — Phase 141: Enterprise IAM Posture.
 *
 * Controls the default authentication mechanism for the platform.
 *
 * Environment variable:
 *   AUTH_MODE — "oidc" | "dev_local" (default: "dev_local")
 *
 * Runtime mode enforcement:
 *   - In rc/prod modes: AUTH_MODE must be "oidc". VistA-only dev_local is blocked.
 *   - In dev/test modes: both values are accepted.
 *
 * This does NOT replace the existing OIDC_ENABLED toggle. Instead it provides
 * a higher-level policy that _requires_ OIDC in production environments while
 * still allowing dev_local VistA RPC auth for sandbox development.
 *
 * The existing Phase 35 OIDC_ENABLED and Phase 66 IDP_OIDC_ENABLED env vars
 * remain for fine-grained provider configuration. AUTH_MODE is the governance
 * overlay that enforces "you MUST have configured one of them in prod".
 */

import { getRuntimeMode, requiresPg } from "../platform/runtime-mode.js";
import { getOidcConfig } from "./oidc-provider.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AuthMode = "oidc" | "dev_local";

const VALID_AUTH_MODES: readonly AuthMode[] = ["oidc", "dev_local"] as const;

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

let cachedAuthMode: AuthMode | null = null;

/**
 * Resolve the current auth mode from AUTH_MODE env var.
 * Defaults to "dev_local" if unset or invalid.
 */
export function getAuthMode(): AuthMode {
  if (cachedAuthMode) return cachedAuthMode;

  const raw = (process.env.AUTH_MODE || "dev_local").toLowerCase().trim();
  if (VALID_AUTH_MODES.includes(raw as AuthMode)) {
    cachedAuthMode = raw as AuthMode;
  } else {
    log.warn("Invalid AUTH_MODE value, falling back to dev_local", { raw });
    cachedAuthMode = "dev_local";
  }

  return cachedAuthMode;
}

/**
 * True when auth mode is OIDC (enterprise SSO required).
 */
export function isOidcRequired(): boolean {
  return getAuthMode() === "oidc";
}

/**
 * True when dev_local VistA RPC auth is the active mode.
 */
export function isDevLocalAuth(): boolean {
  return getAuthMode() === "dev_local";
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export interface AuthModeValidation {
  valid: boolean;
  mode: AuthMode;
  runtimeMode: string;
  oidcConfigured: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate auth mode against runtime mode constraints.
 *
 * rc/prod modes REQUIRE AUTH_MODE=oidc and OIDC must be configured.
 * dev/test modes are permissive but warn if OIDC is expected but not configured.
 *
 * Call this during server startup. Throws on fatal misconfigurations.
 */
export function validateAuthMode(): AuthModeValidation {
  const mode = getAuthMode();
  const runtimeMode = getRuntimeMode();
  const oidcConfig = getOidcConfig();
  const oidcConfigured = oidcConfig.enabled;
  const isProduction = requiresPg(); // rc or prod

  const warnings: string[] = [];
  const errors: string[] = [];

  // rc/prod require OIDC
  if (isProduction && mode !== "oidc") {
    errors.push(
      `AUTH_MODE=${mode} is not allowed in ${runtimeMode} runtime mode. ` +
      `Set AUTH_MODE=oidc for production/release-candidate deployments.`
    );
  }

  // If OIDC mode, verify it's actually configured
  if (mode === "oidc" && !oidcConfigured) {
    if (isProduction) {
      errors.push(
        `AUTH_MODE=oidc requires OIDC_ENABLED=true with valid OIDC configuration. ` +
        `Set OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_ENABLED=true.`
      );
    } else {
      warnings.push(
        "AUTH_MODE=oidc but OIDC_ENABLED is not true. " +
        "OIDC auth will not function until configured."
      );
    }
  }

  // dev_local in non-dev environment: warn
  if (mode === "dev_local" && runtimeMode === "test") {
    warnings.push(
      "AUTH_MODE=dev_local in test mode. Consider AUTH_MODE=oidc for " +
      "integration tests that validate the full auth flow."
    );
  }

  const valid = errors.length === 0;

  if (warnings.length > 0) {
    log.warn("Auth mode validation warnings", { mode, runtimeMode, warnings });
  }

  if (!valid) {
    log.error("Auth mode validation FAILED", { mode, runtimeMode, errors });
  } else {
    log.info("Auth mode validated", { mode, runtimeMode, oidcConfigured });
  }

  return { valid, mode, runtimeMode, oidcConfigured, warnings, errors };
}

/**
 * Enforce auth mode at startup. Throws if configuration is invalid in rc/prod.
 * In dev/test modes, logs warnings but does not throw.
 */
export function enforceAuthMode(): void {
  const result = validateAuthMode();
  if (!result.valid) {
    throw new Error(
      `Auth mode validation failed: ${result.errors.join("; ")}. ` +
      `Current: AUTH_MODE=${result.mode}, PLATFORM_RUNTIME_MODE=${result.runtimeMode}`
    );
  }
}

/**
 * Get auth mode status for health/posture endpoints.
 */
export function getAuthModeStatus(): {
  mode: AuthMode;
  runtimeMode: string;
  oidcConfigured: boolean;
  compliant: boolean;
} {
  const mode = getAuthMode();
  const runtimeMode = getRuntimeMode();
  const oidcConfigured = getOidcConfig().enabled;
  const isProduction = requiresPg();
  const compliant = !isProduction || (mode === "oidc" && oidcConfigured);

  return { mode, runtimeMode, oidcConfigured, compliant };
}

/** Reset cached mode (for testing only). */
export function _resetAuthModeCache(): void {
  cachedAuthMode = null;
}
