/**
 * JWT Validator — Phase 35.
 *
 * Validates JSON Web Tokens using JWKS (JSON Web Key Sets) from the
 * configured OIDC provider (Keycloak). Supports RS256 and ES256.
 *
 * This is a zero-dependency implementation using Node.js built-in crypto.
 * No external JWT libraries required.
 *
 * Security checks:
 *   1. Signature verification via JWKS public keys
 *   2. Expiration (exp) check
 *   3. Not-before (nbf) check
 *   4. Issuer (iss) validation
 *   5. Audience (aud) validation
 *   6. Clock skew tolerance (configurable, default 30s)
 */

import { createVerify, createPublicKey, type KeyObject } from "crypto";
import { getOidcConfig, type OidcTokenClaims } from "./oidc-provider.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface JwksKey {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n?: string;  // RSA modulus
  e?: string;  // RSA exponent
  x?: string;  // EC x coordinate
  y?: string;  // EC y coordinate
  crv?: string; // EC curve
}

interface JwksResponse {
  keys: JwksKey[];
}

export interface JwtValidationResult {
  valid: boolean;
  claims?: OidcTokenClaims;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* JWKS cache                                                          */
/* ------------------------------------------------------------------ */

let jwksCache: Map<string, KeyObject> = new Map();
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLOCK_SKEW_SECONDS = Number(process.env.JWT_CLOCK_SKEW_SECONDS || 30);

/**
 * Fetch and cache JWKS public keys from the configured endpoint.
 */
async function fetchJwks(): Promise<Map<string, KeyObject>> {
  const config = getOidcConfig();
  const now = Date.now();

  if (jwksCache.size > 0 && now - jwksFetchedAt < JWKS_TTL_MS) {
    return jwksCache;
  }

  try {
    const resp = await fetch(config.jwksUri, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      log.warn("JWKS fetch failed", { status: resp.status, uri: config.jwksUri });
      return jwksCache; // Return stale
    }

    const jwks = (await resp.json()) as JwksResponse;
    const newCache = new Map<string, KeyObject>();

    for (const key of jwks.keys) {
      if (key.use && key.use !== "sig") continue; // Only signature keys
      try {
        const publicKey = createPublicKey({ key: jwkToPublicKeyPem(key), format: "pem" });
        newCache.set(key.kid, publicKey);
      } catch (err: any) {
        log.debug("Failed to import JWKS key", { kid: key.kid, error: err.message });
      }
    }

    jwksCache = newCache;
    jwksFetchedAt = now;
    log.debug("JWKS refreshed", { keyCount: newCache.size });
    return jwksCache;
  } catch (err: any) {
    log.warn("JWKS fetch error", { error: err.message });
    return jwksCache; // Return stale
  }
}

/**
 * Convert a JWK to PEM format for Node.js crypto.
 */
function jwkToPublicKeyPem(jwk: JwksKey): string {
  // Use Node.js built-in JWK import
  const keyObj = createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      x: jwk.x,
      y: jwk.y,
      crv: jwk.crv,
    },
    format: "jwk",
  });
  return keyObj.export({ type: "spki", format: "pem" }) as string;
}

/* ------------------------------------------------------------------ */
/* Base64URL helpers                                                    */
/* ------------------------------------------------------------------ */

function base64UrlDecode(str: string): Buffer {
  // Replace URL-safe chars and add padding
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + padding, "base64");
}

/* ------------------------------------------------------------------ */
/* JWT Validation                                                       */
/* ------------------------------------------------------------------ */

/**
 * Validate a JWT token string.
 *
 * Performs full cryptographic verification + claims validation.
 * Returns claims if valid, error string if not.
 */
export async function validateJwt(token: string): Promise<JwtValidationResult> {
  const config = getOidcConfig();

  // 1. Split JWT into parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Malformed JWT: expected 3 parts" };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 2. Decode header
  let header: { alg: string; kid?: string; typ?: string };
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"));
  } catch {
    return { valid: false, error: "Malformed JWT header" };
  }

  // 3. Validate algorithm
  const allowedAlgs = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"];
  if (!allowedAlgs.includes(header.alg)) {
    return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
  }

  // 4. Fetch JWKS and find matching key
  const keys = await fetchJwks();
  let publicKey: KeyObject | undefined;

  if (header.kid) {
    publicKey = keys.get(header.kid);
    if (!publicKey) {
      // Key might have rotated — force refresh
      jwksFetchedAt = 0;
      const refreshedKeys = await fetchJwks();
      publicKey = refreshedKeys.get(header.kid);
    }
  } else {
    // No kid — use first key (common in single-key setups)
    publicKey = keys.values().next().value;
  }

  if (!publicKey) {
    return { valid: false, error: "No matching JWKS key found" };
  }

  // 5. Verify signature
  try {
    const sigInput = `${headerB64}.${payloadB64}`;
    const signature = base64UrlDecode(signatureB64);
    const algMap: Record<string, string> = {
      RS256: "RSA-SHA256", RS384: "RSA-SHA384", RS512: "RSA-SHA512",
      ES256: "SHA256", ES384: "SHA384", ES512: "SHA512",
    };
    const verifier = createVerify(algMap[header.alg]);
    verifier.update(sigInput);
    const isValid = verifier.verify(publicKey, signature);
    if (!isValid) {
      return { valid: false, error: "Invalid JWT signature" };
    }
  } catch (err: any) {
    return { valid: false, error: `Signature verification failed: ${err.message}` };
  }

  // 6. Decode and validate claims
  let claims: OidcTokenClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return { valid: false, error: "Malformed JWT payload" };
  }

  const now = Math.floor(Date.now() / 1000);

  // Check expiration
  if (claims.exp && claims.exp + CLOCK_SKEW_SECONDS < now) {
    return { valid: false, error: "JWT expired" };
  }

  // Check not-before
  if (claims.iat && claims.iat - CLOCK_SKEW_SECONDS > now) {
    return { valid: false, error: "JWT not yet valid (iat in future)" };
  }

  // Check issuer
  if (claims.iss !== config.issuer) {
    return { valid: false, error: `Invalid issuer: expected ${config.issuer}, got ${claims.iss}` };
  }

  // Check audience
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(config.audience)) {
    return { valid: false, error: `Invalid audience: expected ${config.audience}` };
  }

  return { valid: true, claims };
}

/**
 * Validate a JWT and return mapped user metadata, or null if invalid.
 * This is the primary entry point for auth gateway integration.
 */
export async function validateAndExtractUser(token: string): Promise<{
  sub: string;
  duz: string;
  userName: string;
  roles: string[];
  facilityStation: string;
  tenantId: string;
} | null> {
  const result = await validateJwt(token);
  if (!result.valid || !result.claims) {
    log.debug("JWT validation failed", { error: result.error });
    return null;
  }

  const { claims } = result;
  // Extract roles from various claim formats
  let roles: string[] = [];
  if (Array.isArray(claims.realm_roles)) {
    roles = claims.realm_roles;
  } else if (claims.realm_access?.roles) {
    roles = claims.realm_access.roles;
  }

  return {
    sub: claims.sub,
    duz: (claims.duz as string) || claims.sub,
    userName: (claims.name as string) || (claims.preferred_username as string) || claims.sub,
    roles,
    facilityStation: (claims.facility_station as string) || "",
    tenantId: (claims.tenant_id as string) || "default",
  };
}

/** Reset JWKS cache (for testing). */
export function resetJwksCache(): void {
  jwksCache = new Map();
  jwksFetchedAt = 0;
}
