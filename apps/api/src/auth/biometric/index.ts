/**
 * Biometric Provider Registry — Phase 35.
 *
 * Factory for biometric authentication providers.
 * Default: PasskeysProvider (Keycloak WebAuthn).
 * Optional: FaceVerificationProvider (disabled by default).
 *
 * Environment variables:
 *   PASSKEYS_ENABLED            — "true" to enable passkeys
 *   FACE_VERIFICATION_ENABLED   — "true" to enable face (requires vendor)
 *   FACE_VERIFICATION_VENDOR    — vendor identifier (e.g., "aws-rekognition")
 */

import type { BiometricAuthProvider, BiometricMethod } from './types.js';
import { PasskeysProvider } from './passkeys-provider.js';
import { FaceVerificationProvider } from './face-provider.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const providers = new Map<BiometricMethod, BiometricAuthProvider>();

/**
 * Initialize all configured biometric providers.
 * Called once at server startup.
 */
export async function initBiometricProviders(): Promise<void> {
  // Passkeys (WebAuthn) — primary
  const passkeys = new PasskeysProvider();
  const passkeysReady = await passkeys.initialize();
  if (passkeysReady) {
    providers.set('passkey', passkeys);
    log.info('Biometric: Passkeys provider registered');
  }

  // Face verification — optional, OFF by default
  const face = new FaceVerificationProvider();
  const faceReady = await face.initialize();
  if (faceReady) {
    providers.set('face', face);
    log.info('Biometric: Face verification provider registered');
  }

  log.info('Biometric providers initialized', {
    registered: [...providers.keys()],
  });
}

/**
 * Get a biometric provider by method.
 */
export function getBiometricProvider(method: BiometricMethod): BiometricAuthProvider | null {
  return providers.get(method) || null;
}

/**
 * List all registered (enabled) providers.
 */
export function listBiometricProviders(): Array<{
  id: string;
  name: string;
  method: BiometricMethod;
  enabled: boolean;
}> {
  return [...providers.values()].map((p) => ({
    id: p.id,
    name: p.name,
    method: p.method,
    enabled: p.enabled,
  }));
}

/**
 * Check if any biometric provider is available.
 */
export function hasBiometricProviders(): boolean {
  return providers.size > 0;
}

// Re-export types
export type { BiometricAuthProvider, BiometricMethod } from './types.js';
