/**
 * Biometric Authentication Types -- Phase 35.
 *
 * Provider-agnostic interfaces for biometric authentication.
 * Supports passkeys (WebAuthn) as primary, face verification as optional.
 *
 * Design principles:
 *   - No biometric data (fingerprints, face images) transmitted to our servers
 *   - WebAuthn assertions only (public key cryptography)
 *   - Face verification is vendor-replaceable and OFF by default
 *   - All operations produce standardized audit events
 */

/* ------------------------------------------------------------------ */
/* Core types                                                          */
/* ------------------------------------------------------------------ */

export type BiometricMethod = 'passkey' | 'face' | 'fingerprint';

export interface BiometricAuthProvider {
  /** Provider identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Which biometric method this provider handles */
  readonly method: BiometricMethod;
  /** Whether this provider is currently enabled */
  readonly enabled: boolean;

  /**
   * Initialize the provider. Called once at startup.
   * Returns true if the provider is available and configured.
   */
  initialize(): Promise<boolean>;

  /**
   * Begin a registration ceremony (e.g., WebAuthn registration).
   * Returns provider-specific challenge/options for the client.
   */
  startRegistration(userId: string, userName: string): Promise<BiometricRegistrationChallenge>;

  /**
   * Complete a registration ceremony with the client's response.
   */
  completeRegistration(
    userId: string,
    response: BiometricRegistrationResponse
  ): Promise<BiometricRegistrationResult>;

  /**
   * Begin an authentication ceremony (e.g., WebAuthn assertion).
   */
  startAuthentication(userId?: string): Promise<BiometricAuthenticationChallenge>;

  /**
   * Complete an authentication ceremony with the client's response.
   */
  completeAuthentication(
    response: BiometricAuthenticationResponse
  ): Promise<BiometricAuthenticationResult>;

  /**
   * List registered credentials for a user.
   */
  listCredentials(userId: string): Promise<BiometricCredential[]>;

  /**
   * Remove a registered credential.
   */
  removeCredential(userId: string, credentialId: string): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/* Registration types                                                  */
/* ------------------------------------------------------------------ */

export interface BiometricRegistrationChallenge {
  /** Challenge ID for correlation */
  challengeId: string;
  /** Provider-specific options (e.g., PublicKeyCredentialCreationOptions) */
  options: Record<string, unknown>;
  /** Expiration time (epoch ms) */
  expiresAt: number;
}

export interface BiometricRegistrationResponse {
  /** Challenge ID from the registration challenge */
  challengeId: string;
  /** Provider-specific response data */
  response: Record<string, unknown>;
}

export interface BiometricRegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Authentication types                                                */
/* ------------------------------------------------------------------ */

export interface BiometricAuthenticationChallenge {
  /** Challenge ID for correlation */
  challengeId: string;
  /** Provider-specific options (e.g., PublicKeyCredentialRequestOptions) */
  options: Record<string, unknown>;
  /** Expiration time (epoch ms) */
  expiresAt: number;
}

export interface BiometricAuthenticationResponse {
  /** Challenge ID from the auth challenge */
  challengeId: string;
  /** Provider-specific response data */
  response: Record<string, unknown>;
}

export interface BiometricAuthenticationResult {
  success: boolean;
  /** User ID if authentication succeeded */
  userId?: string;
  /** User display name */
  userName?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Credential management                                               */
/* ------------------------------------------------------------------ */

export interface BiometricCredential {
  /** Credential ID */
  id: string;
  /** User-assigned friendly name */
  name: string;
  /** Biometric method */
  method: BiometricMethod;
  /** When the credential was registered */
  registeredAt: string;
  /** Last used timestamp */
  lastUsedAt?: string;
  /** Device info (user-agent at registration time) */
  deviceInfo?: string;
}

/* ------------------------------------------------------------------ */
/* Face verification specific (optional, OFF by default)               */
/* ------------------------------------------------------------------ */

export interface FaceVerificationConfig {
  /** Feature flag -- must be explicitly enabled */
  enabled: boolean;
  /** Tenant-level admin setting required */
  requireTenantApproval: boolean;
  /** Require liveness detection */
  requireLivenessCheck: boolean;
  /** Store raw face images? (default: false, MUST be false in production) */
  storeRawImages: boolean;
  /** Vendor/implementation identifier */
  vendorId: string;
  /** Maximum face template size (bytes) */
  maxTemplateSizeBytes: number;
}

export const DEFAULT_FACE_CONFIG: FaceVerificationConfig = {
  enabled: false,
  requireTenantApproval: true,
  requireLivenessCheck: true,
  storeRawImages: false,
  vendorId: 'none',
  maxTemplateSizeBytes: 4096,
};

/* ------------------------------------------------------------------ */
/* Audit event types for biometrics                                    */
/* ------------------------------------------------------------------ */

export interface BiometricAuditEvent {
  /** Which biometric method */
  method: BiometricMethod;
  /** Registration or authentication */
  ceremony: 'registration' | 'authentication';
  /** Success or failure */
  outcome: 'success' | 'failure';
  /** User ID involved */
  userId: string;
  /** No raw biometric data -- only metadata */
  credentialId?: string;
  /** Error message if failed */
  error?: string;
}
