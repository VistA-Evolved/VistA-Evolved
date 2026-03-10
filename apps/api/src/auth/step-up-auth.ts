/**
 * Step-Up Authentication Policy -- Phase 338 (W16-P2).
 *
 * Defines a 3-tier assurance model for actions:
 *   - standard:  normal session auth sufficient
 *   - elevated:  requires recent auth (< configurable window) OR MFA
 *   - critical:  requires BOTH recent auth AND MFA
 *
 * The step-up policy is checked AFTER the normal auth gateway and policy
 * engine. It's an additional layer for sensitive operations.
 *
 * Usage:
 *   const result = evaluateStepUp(action, session, mfaState);
 *   if (!result.allowed) { reply.code(403).send({ stepUpRequired: result.requirement }); }
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AssuranceLevel = 'standard' | 'elevated' | 'critical';

export interface StepUpRequirement {
  /** Required assurance level */
  level: AssuranceLevel;
  /** Whether recent auth (password re-entry) is needed */
  recentAuthRequired: boolean;
  /** Whether MFA verification is needed */
  mfaRequired: boolean;
  /** Max age of last auth event to count as "recent" (ms) */
  recentAuthWindowMs: number;
}

export interface MfaState {
  /** Whether MFA is enrolled for this user */
  enrolled: boolean;
  /** Timestamp of last MFA verification (epoch ms), 0 if never */
  lastVerifiedAt: number;
  /** MFA method used (totp, webauthn, sms, etc.) */
  method?: string;
}

export interface StepUpResult {
  /** Whether the action is allowed at current assurance level */
  allowed: boolean;
  /** What is required if not allowed */
  requirement?: StepUpRequirement;
  /** Human-readable reason */
  reason?: string;
  /** Current assurance level achieved */
  currentLevel: AssuranceLevel;
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** Default recent-auth window: 5 minutes */
const DEFAULT_RECENT_AUTH_WINDOW_MS = Number(
  process.env.STEP_UP_RECENT_AUTH_WINDOW_MS || 5 * 60 * 1000
);

/** MFA verification validity window: 15 minutes */
const MFA_VALIDITY_WINDOW_MS = Number(process.env.STEP_UP_MFA_VALIDITY_MS || 15 * 60 * 1000);

/* ------------------------------------------------------------------ */
/* Step-Up Policy Map                                                  */
/* ------------------------------------------------------------------ */

/**
 * Actions requiring elevated or critical assurance.
 * Actions NOT listed here default to "standard" (no step-up needed).
 */
const STEP_UP_POLICY: Record<string, AssuranceLevel> = {
  // Critical: admin operations, credential changes, data export
  'admin.user-manage': 'critical',
  'admin.system': 'critical',
  'admin.tenant': 'critical',
  'audit.export': 'critical',
  'analytics.export': 'critical',
  'report.export': 'critical',
  'admin.config': 'critical',

  // Elevated: clinical writes, imaging, ordering
  'clinical.order-sign': 'elevated',
  'clinical.order-release': 'elevated',
  'clinical.medication-add': 'elevated',
  'clinical.allergy-add': 'elevated',
  'imaging.order': 'elevated',
  'imaging.upload': 'elevated',
  'imaging.device-manage': 'elevated',
  'telehealth.create': 'elevated',
};

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Determine current assurance level from session and MFA state.
 */
export function computeAssuranceLevel(
  lastAuthAt: number,
  mfaState: MfaState,
  now?: number
): AssuranceLevel {
  const ts = now ?? Date.now();
  const recentAuth = ts - lastAuthAt < DEFAULT_RECENT_AUTH_WINDOW_MS;
  const mfaRecent =
    mfaState.enrolled &&
    mfaState.lastVerifiedAt > 0 &&
    ts - mfaState.lastVerifiedAt < MFA_VALIDITY_WINDOW_MS;

  if (recentAuth && mfaRecent) return 'critical';
  if (recentAuth || mfaRecent) return 'elevated';
  return 'standard';
}

/**
 * Get the step-up requirement for an action. Returns null if standard is sufficient.
 */
export function getStepUpRequirement(action: string): StepUpRequirement | null {
  const level = STEP_UP_POLICY[action];
  if (!level || level === 'standard') return null;

  if (level === 'critical') {
    return {
      level: 'critical',
      recentAuthRequired: true,
      mfaRequired: true,
      recentAuthWindowMs: DEFAULT_RECENT_AUTH_WINDOW_MS,
    };
  }

  // elevated: recent auth OR MFA
  return {
    level: 'elevated',
    recentAuthRequired: false,
    mfaRequired: false, // either is OK for elevated
    recentAuthWindowMs: DEFAULT_RECENT_AUTH_WINDOW_MS,
  };
}

/**
 * Evaluate step-up policy for an action given current session context.
 *
 * @param action - policy action string (e.g., "clinical.order-sign")
 * @param lastAuthAt - epoch ms of the user's last full auth (login or re-auth)
 * @param mfaState - current MFA state for the session
 * @returns StepUpResult indicating whether the action is allowed
 */
export function evaluateStepUp(
  action: string,
  lastAuthAt: number,
  mfaState: MfaState,
  now?: number
): StepUpResult {
  const ts = now ?? Date.now();
  const currentLevel = computeAssuranceLevel(lastAuthAt, mfaState, ts);
  const requirement = getStepUpRequirement(action);

  // No step-up needed -- standard is fine
  if (!requirement) {
    return { allowed: true, currentLevel };
  }

  // Compare levels
  const LEVEL_ORDER: Record<AssuranceLevel, number> = {
    standard: 0,
    elevated: 1,
    critical: 2,
  };

  if (LEVEL_ORDER[currentLevel] >= LEVEL_ORDER[requirement.level]) {
    return { allowed: true, currentLevel };
  }

  return {
    allowed: false,
    requirement,
    currentLevel,
    reason: `Action '${action}' requires ${requirement.level} assurance (current: ${currentLevel})`,
  };
}

/**
 * Get all actions at a given assurance level or above.
 */
export function getActionsAtLevel(level: AssuranceLevel): string[] {
  const LEVEL_ORDER: Record<AssuranceLevel, number> = {
    standard: 0,
    elevated: 1,
    critical: 2,
  };
  const minOrder = LEVEL_ORDER[level];
  return Object.entries(STEP_UP_POLICY)
    .filter(([, l]) => LEVEL_ORDER[l] >= minOrder)
    .map(([action]) => action);
}

/**
 * Check if an action requires any step-up (elevated or critical).
 */
export function requiresStepUp(action: string): boolean {
  return !!STEP_UP_POLICY[action];
}
