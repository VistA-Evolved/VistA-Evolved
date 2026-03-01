/**
 * MFA Enforcement Hooks — Phase 338 (W16-P2).
 *
 * Provides MFA enrollment tracking, verification recording, and policy
 * enforcement hooks. Feature-flagged via MFA_ENFORCEMENT_ENABLED env var.
 *
 * Design:
 *   - MFA state is per-session (stamped on verification)
 *   - MFA policy defines which roles require MFA
 *   - Grace period allows newly required users time to enroll
 *   - Exempt actions (e.g., read-only views) bypass MFA check
 *
 * This module does NOT implement the actual MFA challenge/response (TOTP, WebAuthn, etc.).
 * Those are in the biometric/ directory (Phase 35). This module hooks into
 * the auth flow to enforce MFA where policy requires it.
 */

import { log } from "../lib/logger.js";
import type { UserRole } from "./session-store.js";
import type { MfaState } from "./step-up-auth.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** Whether MFA enforcement is active. Default: false (opt-in). */
export const MFA_ENFORCEMENT_ENABLED =
  process.env.MFA_ENFORCEMENT_ENABLED === "true";

/** Grace period for newly required MFA enrollment (ms). Default: 7 days. */
const MFA_GRACE_PERIOD_MS = Number(
  process.env.MFA_GRACE_PERIOD_MS || 7 * 24 * 60 * 60 * 1000,
);

/** MFA verification validity window (ms). Default: 15 minutes. */
const MFA_VERIFICATION_WINDOW_MS = Number(
  process.env.MFA_VERIFICATION_WINDOW_MS || 15 * 60 * 1000,
);

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MfaMethod = "totp" | "webauthn" | "sms" | "email" | "passkey";

export interface MfaEnrollment {
  /** User ID (DUZ or OIDC sub) */
  userId: string;
  /** Tenant ID */
  tenantId: string;
  /** Whether MFA is enrolled */
  enrolled: boolean;
  /** Enrolled MFA methods */
  methods: MfaMethod[];
  /** When enrollment was completed (epoch ms) */
  enrolledAt: number;
  /** Grace period expiration (epoch ms), 0 if not in grace period */
  graceExpiresAt: number;
}

export interface MfaCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Whether user is in grace period */
  inGracePeriod: boolean;
  /** Whether MFA enrollment is needed */
  enrollmentRequired: boolean;
  /** Whether MFA verification is needed right now */
  verificationRequired: boolean;
}

/* ------------------------------------------------------------------ */
/* MFA Policy                                                          */
/* ------------------------------------------------------------------ */

/** Roles that require MFA when enforcement is enabled. */
const MFA_REQUIRED_ROLES: Set<UserRole> = new Set([
  "admin",
  "provider",
  "pharmacist",
]);

/** Actions exempt from MFA enforcement (read-only, low-risk). */
const MFA_EXEMPT_ACTIONS: Set<string> = new Set([
  "auth.login",
  "auth.logout",
  "auth.session",
  "phi.patient-search",
  "phi.patient-list",
  "system.health",
  "portal.own-data",
  "portal.messaging",
  "portal.appointments",
]);

/* ------------------------------------------------------------------ */
/* In-memory enrollment store (Ephemeral — DB-backed when PG available) */
/* ------------------------------------------------------------------ */

const enrollmentStore = new Map<string, MfaEnrollment>();

/** Store key: tenantId:userId */
function enrollKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Check if MFA is required for a given action, role, and current MFA state.
 */
export function checkMfaRequired(
  action: string,
  role: UserRole,
  userId: string,
  tenantId: string,
  mfaState: MfaState,
  now?: number,
): MfaCheckResult {
  const ts = now ?? Date.now();

  // Feature gate
  if (!MFA_ENFORCEMENT_ENABLED) {
    return { allowed: true, inGracePeriod: false, enrollmentRequired: false, verificationRequired: false };
  }

  // Exempt actions
  if (MFA_EXEMPT_ACTIONS.has(action)) {
    return { allowed: true, inGracePeriod: false, enrollmentRequired: false, verificationRequired: false };
  }

  // Check if role requires MFA
  if (!MFA_REQUIRED_ROLES.has(role)) {
    return { allowed: true, inGracePeriod: false, enrollmentRequired: false, verificationRequired: false };
  }

  // Check enrollment
  const enrollment = getEnrollment(tenantId, userId);

  if (!enrollment || !enrollment.enrolled) {
    // Not enrolled — check grace period
    if (enrollment && enrollment.graceExpiresAt > 0 && ts < enrollment.graceExpiresAt) {
      return {
        allowed: true,
        inGracePeriod: true,
        enrollmentRequired: true,
        verificationRequired: false,
        reason: "MFA enrollment required — grace period active",
      };
    }

    // No enrollment and no/expired grace — require enrollment
    return {
      allowed: false,
      inGracePeriod: false,
      enrollmentRequired: true,
      verificationRequired: false,
      reason: "MFA enrollment required for this role",
    };
  }

  // Enrolled — check recent verification
  if (!mfaState.enrolled) {
    // Session doesn't have MFA state yet — need verification
    return {
      allowed: false,
      inGracePeriod: false,
      enrollmentRequired: false,
      verificationRequired: true,
      reason: "MFA verification required",
    };
  }

  if (mfaState.lastVerifiedAt <= 0 || (ts - mfaState.lastVerifiedAt) > MFA_VERIFICATION_WINDOW_MS) {
    return {
      allowed: false,
      inGracePeriod: false,
      enrollmentRequired: false,
      verificationRequired: true,
      reason: "MFA verification expired — re-verification required",
    };
  }

  return { allowed: true, inGracePeriod: false, enrollmentRequired: false, verificationRequired: false };
}

/**
 * Record MFA enrollment for a user.
 */
export function recordMfaEnrollment(
  tenantId: string,
  userId: string,
  methods: MfaMethod[],
): MfaEnrollment {
  const enrollment: MfaEnrollment = {
    userId,
    tenantId,
    enrolled: true,
    methods,
    enrolledAt: Date.now(),
    graceExpiresAt: 0,
  };
  enrollmentStore.set(enrollKey(tenantId, userId), enrollment);
  log.info('MFA enrollment recorded', { userId, tenantId, methods });
  return enrollment;
}

/**
 * Start a grace period for a user who needs to enroll MFA.
 */
export function startMfaGracePeriod(
  tenantId: string,
  userId: string,
): MfaEnrollment {
  const existing = enrollmentStore.get(enrollKey(tenantId, userId));
  const enrollment: MfaEnrollment = {
    userId,
    tenantId,
    enrolled: existing?.enrolled ?? false,
    methods: existing?.methods ?? [],
    enrolledAt: existing?.enrolledAt ?? 0,
    graceExpiresAt: Date.now() + MFA_GRACE_PERIOD_MS,
  };
  enrollmentStore.set(enrollKey(tenantId, userId), enrollment);
  return enrollment;
}

/**
 * Record MFA verification on a session. Returns updated MFA state.
 */
export function recordMfaVerification(method: MfaMethod): MfaState {
  return {
    enrolled: true,
    lastVerifiedAt: Date.now(),
    method,
  };
}

/**
 * Get enrollment status for a user.
 */
export function getEnrollment(tenantId: string, userId: string): MfaEnrollment | null {
  return enrollmentStore.get(enrollKey(tenantId, userId)) ?? null;
}

/**
 * Check if a role requires MFA when enforcement is enabled.
 */
export function roleRequiresMfa(role: UserRole): boolean {
  if (!MFA_ENFORCEMENT_ENABLED) return false;
  return MFA_REQUIRED_ROLES.has(role);
}

/**
 * Get store size (for store-policy.ts registration).
 */
export function getMfaEnrollmentStoreSize(): number {
  return enrollmentStore.size;
}
