/**
 * Face Verification Provider -- Phase 35.
 *
 * DISABLED BY DEFAULT. This is a scaffold for future face verification.
 *
 * Rules:
 *   - Feature-flag + tenant admin setting required to enable
 *   - Requires liveness check
 *   - Must NOT store raw images by default
 *   - Must produce standardized audit events
 *   - Must be vendor-replaceable (implements BiometricAuthProvider interface)
 *
 * This implementation is a no-op scaffold that always returns disabled.
 */

import type {
  BiometricAuthProvider,
  BiometricRegistrationChallenge,
  BiometricRegistrationResponse,
  BiometricRegistrationResult,
  BiometricAuthenticationChallenge,
  BiometricAuthenticationResponse,
  BiometricAuthenticationResult,
  BiometricCredential,
  FaceVerificationConfig,
} from './types.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function getFaceConfig(): FaceVerificationConfig {
  return {
    enabled: process.env.FACE_VERIFICATION_ENABLED === 'true',
    requireTenantApproval: true,
    requireLivenessCheck: true,
    storeRawImages: false, // NEVER true in production
    vendorId: process.env.FACE_VERIFICATION_VENDOR || 'none',
    maxTemplateSizeBytes: 4096,
  };
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                             */
/* ------------------------------------------------------------------ */

export class FaceVerificationProvider implements BiometricAuthProvider {
  readonly id = 'face-verification';
  readonly name = 'Face Verification (Disabled by Default)';
  readonly method = 'face' as const;

  get enabled(): boolean {
    return getFaceConfig().enabled;
  }

  async initialize(): Promise<boolean> {
    const config = getFaceConfig();
    if (!config.enabled) {
      log.info('FaceVerificationProvider disabled (FACE_VERIFICATION_ENABLED != true)');
      return false;
    }

    if (config.vendorId === 'none') {
      log.warn('FaceVerificationProvider enabled but no vendor configured');
      return false;
    }

    if (config.storeRawImages) {
      log.error(
        'SECURITY: Face verification configured to store raw images -- this is prohibited in production'
      );
      return false;
    }

    if (!config.requireLivenessCheck) {
      log.warn('Face verification liveness check disabled -- replay attacks possible');
    }

    log.info('FaceVerificationProvider initialized', {
      vendor: config.vendorId,
      liveness: config.requireLivenessCheck,
      storeImages: config.storeRawImages,
    });
    return true;
  }

  async startRegistration(
    _userId: string,
    _userName: string
  ): Promise<BiometricRegistrationChallenge> {
    if (!this.enabled) {
      throw new Error('Face verification is disabled');
    }
    // Scaffold: vendor-specific implementation would go here
    // Must include liveness challenge
    throw new Error('Face verification vendor not configured');
  }

  async completeRegistration(
    _userId: string,
    _response: BiometricRegistrationResponse
  ): Promise<BiometricRegistrationResult> {
    if (!this.enabled) {
      return { success: false, error: 'Face verification is disabled' };
    }
    // Scaffold: vendor-specific implementation would validate face template
    // Must verify liveness, must NOT store raw images
    return { success: false, error: 'Face verification vendor not configured' };
  }

  async startAuthentication(_userId?: string): Promise<BiometricAuthenticationChallenge> {
    if (!this.enabled) {
      throw new Error('Face verification is disabled');
    }
    throw new Error('Face verification vendor not configured');
  }

  async completeAuthentication(
    _response: BiometricAuthenticationResponse
  ): Promise<BiometricAuthenticationResult> {
    if (!this.enabled) {
      return { success: false, error: 'Face verification is disabled' };
    }
    return { success: false, error: 'Face verification vendor not configured' };
  }

  async listCredentials(_userId: string): Promise<BiometricCredential[]> {
    return [];
  }

  async removeCredential(_userId: string, _credentialId: string): Promise<boolean> {
    return false;
  }
}
