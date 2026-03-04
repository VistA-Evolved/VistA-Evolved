/**
 * Portal IAM Types — Phase 29
 *
 * Identity model: PortalUser is NOT a VistA DUZ.
 * Portal identity is mapped to patient(s) by enrollment workflow.
 * Mapping: PortalUser <-> PatientProfile(s) (self + proxies)
 */

/* ------------------------------------------------------------------ */
/* Portal User                                                          */
/* ------------------------------------------------------------------ */

export interface PortalUser {
  id: string;
  /** Unique login identifier (email or username) */
  username: string;
  /** Display name */
  displayName: string;
  /** Email address (used for password reset) */
  email: string;
  /** Scrypt-hashed password (never plaintext) */
  passwordHash: string;
  /** Account status */
  status: PortalUserStatus;
  /** Consecutive failed login attempts */
  failedAttempts: number;
  /** When the account was locked out (null if not locked) */
  lockedUntil: number | null;
  /** MFA enabled */
  mfaEnabled: boolean;
  /** TOTP secret (encrypted, null if not set) */
  totpSecret: string | null;
  /** Enrolled patient profiles (self + proxies) */
  patientProfiles: PatientProfile[];
  /** Active device sessions */
  deviceSessions: DeviceSession[];
  /** Password reset state */
  passwordResetToken: string | null;
  passwordResetExpiry: number | null;
  /** Metadata */
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export type PortalUserStatus = 'active' | 'locked' | 'disabled' | 'pending_verification';

/* ------------------------------------------------------------------ */
/* Patient Profile Mapping                                              */
/* ------------------------------------------------------------------ */

export interface PatientProfile {
  id: string;
  /** VistA patient DFN (the real clinical identity) */
  patientDfn: string;
  /** Patient display name from VistA */
  patientName: string;
  /** Relationship to the portal user */
  relationship: PatientRelationship;
  /** Whether this is the user's own record */
  isSelf: boolean;
  /** Access level granted */
  accessLevel: 'full' | 'read_only' | 'limited';
  /** When the mapping was established */
  enrolledAt: string;
  /** Verification status */
  verified: boolean;
}

export type PatientRelationship =
  | 'self'
  | 'parent'
  | 'guardian'
  | 'spouse'
  | 'caregiver'
  | 'legal_representative'
  | 'power_of_attorney';

/* ------------------------------------------------------------------ */
/* Proxy Invitation                                                     */
/* ------------------------------------------------------------------ */

export interface ProxyInvitation {
  id: string;
  /** The portal user requesting proxy access */
  requestorUserId: string;
  requestorName: string;
  /** The patient who must accept/decline */
  patientDfn: string;
  patientName: string;
  /** Desired relationship */
  relationship: PatientRelationship;
  /** Desired access level */
  requestedAccessLevel: 'full' | 'read_only' | 'limited';
  /** Invitation status */
  status: InvitationStatus;
  /** Reason/justification for proxy request */
  reason: string;
  /** Verification document reference (if provided) */
  verificationDocRef: string | null;
  /** Age of the patient at time of request (for policy enforcement) */
  patientAge: number | null;
  /** Sensitivity policy evaluation result */
  policyResult: PolicyResult | null;
  /** Timestamps */
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
}

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'blocked_by_policy';

export interface PolicyResult {
  allowed: boolean;
  blockedRules: string[];
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Device Session                                                       */
/* ------------------------------------------------------------------ */

export interface DeviceSession {
  id: string;
  /** Portal user ID */
  userId: string;
  /** Session token (only stored hashed in device record) */
  tokenHash: string;
  /** Device info */
  deviceType: 'browser' | 'mobile' | 'tablet' | 'unknown';
  /** User agent string (truncated) */
  userAgent: string;
  /** IP address (anonymized in production) */
  ipAddress: string;
  /** Geo approximation (city-level only, no PHI) */
  geoHint: string | null;
  /** Session timestamps */
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  /** Active or revoked */
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Access Log (Patient-Visible)                                         */
/* ------------------------------------------------------------------ */

export interface AccessLogEntry {
  id: string;
  /** Timestamp of the event */
  timestamp: string;
  /** Which portal user performed the action */
  userId: string;
  /** Display name of the acting user */
  actorName: string;
  /** Whether this was a proxy action */
  isProxy: boolean;
  /** If proxy, which patient profile was accessed */
  targetPatientDfn: string | null;
  /** Event type */
  eventType: AccessLogEventType;
  /** Human-readable description (no PHI) */
  description: string;
  /** Additional metadata (no PHI) */
  metadata: Record<string, string>;
}

export type AccessLogEventType =
  | 'sign_in'
  | 'sign_out'
  | 'session_expired'
  | 'view_record_section'
  | 'export_record'
  | 'share_code_create'
  | 'share_code_redeem'
  | 'proxy_switch'
  | 'message_send'
  | 'message_read'
  | 'refill_request'
  | 'appointment_request'
  | 'appointment_cancel'
  | 'intake_start'
  | 'intake_submit'
  | 'password_change'
  | 'mfa_setup'
  | 'mfa_verify'
  | 'profile_update'
  | 'proxy_invitation_sent'
  | 'proxy_invitation_response';

/* ------------------------------------------------------------------ */
/* Auth Request/Response Shapes                                         */
/* ------------------------------------------------------------------ */

export interface PortalRegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
  /** Optional: patient DFN for self-enrollment */
  patientDfn?: string;
  patientName?: string;
}

export interface PortalLoginRequest {
  username: string;
  password: string;
  /** Optional TOTP code if MFA is enabled */
  totpCode?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

/* ------------------------------------------------------------------ */
/* CSRF                                                                 */
/* ------------------------------------------------------------------ */

export interface CsrfTokenResponse {
  csrfToken: string;
}
