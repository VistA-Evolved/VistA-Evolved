/**
 * Order Check Types — Phase 434 (W27 P4)
 *
 * Structured types for VistA order check system (ORWDXC RPCs).
 * Used by orders-cpoe.ts for the order-check endpoint and the
 * pre-sign check gate.
 */

/* ------------------------------------------------------------------ */
/* Order Check Severity                                                */
/* ------------------------------------------------------------------ */

export type OrderCheckSeverity = 'high' | 'moderate' | 'low' | 'info';

/* ------------------------------------------------------------------ */
/* Order Check Category                                                */
/* ------------------------------------------------------------------ */

export type OrderCheckCategory =
  | 'drug-allergy' // ORWDXC checks allergy reactant match
  | 'drug-drug' // Drug-drug interaction (PSJOE)
  | 'duplicate-therapy' // Duplicate therapeutic class
  | 'duplicate-order' // Same drug already ordered
  | 'contraindication' // Clinical contraindication
  | 'dose-range' // Dose outside normal range
  | 'critical-result' // Pending critical lab result
  | 'age-weight' // Age/weight based check
  | 'pregnancy' // Pregnancy contraindication
  | 'renal' // Renal dose adjustment needed
  | 'other'; // Unclassified check

/* ------------------------------------------------------------------ */
/* Order Check Finding                                                 */
/* ------------------------------------------------------------------ */

export interface OrderCheckFinding {
  /** Auto-generated check ID */
  id: string;
  /** Check category */
  category: OrderCheckCategory;
  /** Severity level */
  severity: OrderCheckSeverity;
  /** Human-readable check message */
  message: string;
  /** Detailed check text (from ORWDXC DISPLAY) */
  displayText?: string;
  /** Order IEN this check applies to */
  orderIen: string;
  /** True if this check blocks signing without override */
  requiresOverride: boolean;
  /** True if the clinician has acknowledged this check */
  acknowledged: boolean;
  /** Override reason (required for high-severity checks) */
  overrideReason?: string;
  /** Source RPC that produced this check */
  sourceRpc: string;
}

/* ------------------------------------------------------------------ */
/* Order Check Session                                                 */
/* ------------------------------------------------------------------ */

export interface OrderCheckSession {
  /** Session ID */
  sessionId: string;
  /** Patient DFN */
  dfn: string;
  /** Order IENs being checked */
  orderIens: string[];
  /** All findings from ORWDXC ACCEPT */
  findings: OrderCheckFinding[];
  /** Session state */
  state: 'open' | 'reviewed' | 'acknowledged' | 'expired';
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** True if all high-severity findings are acknowledged */
  allHighAcknowledged: boolean;
  /** True if session is eligible for signing */
  signEligible: boolean;
}

/* ------------------------------------------------------------------ */
/* Pre-Sign Check Gate Result                                          */
/* ------------------------------------------------------------------ */

export interface PreSignCheckResult {
  /** Can the orders be signed? */
  canSign: boolean;
  /** Session ID for tracking */
  sessionId?: string;
  /** Number of findings */
  findingCount: number;
  /** Number of high-severity findings not yet acknowledged */
  unacknowledgedHighCount: number;
  /** All findings */
  findings: OrderCheckFinding[];
  /** Blockers preventing signing */
  blockers: string[];
  /** Warnings (non-blocking) */
  warnings: string[];
  /** Source information */
  source: 'vista' | 'integration-pending';
  /** RPCs used */
  rpcUsed: string[];
}

/* ------------------------------------------------------------------ */
/* Acknowledge Request                                                 */
/* ------------------------------------------------------------------ */

export interface OrderCheckAcknowledgeRequest {
  /** Session ID */
  sessionId: string;
  /** Finding IDs to acknowledge */
  findingIds: string[];
  /** Override reason (required for high-severity checks) */
  overrideReason?: string;
  /** Provider DUZ performing acknowledgment */
  providerDuz: string;
}

/* ------------------------------------------------------------------ */
/* Category Detection Helpers                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_PATTERNS: Array<[RegExp, OrderCheckCategory]> = [
  [/allerg/i, 'drug-allergy'],
  [/interact/i, 'drug-drug'],
  [/duplicate\s*(therap|class)/i, 'duplicate-therapy'],
  [/duplicate\s*(order|med)/i, 'duplicate-order'],
  [/contraindic/i, 'contraindication'],
  [/dose\s*(rang|limit|exceed)/i, 'dose-range'],
  [/critical\s*(result|lab|value)/i, 'critical-result'],
  [/age|weight|pediatric|geriatric/i, 'age-weight'],
  [/pregnan/i, 'pregnancy'],
  [/renal|creatinine|gfr|kidney/i, 'renal'],
];

/** Detect order check category from message text. */
export function detectCategory(message: string): OrderCheckCategory {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(message)) return category;
  }
  return 'other';
}

/** Map VistA severity code to structured severity. */
export function mapSeverity(raw: string): OrderCheckSeverity {
  const normalized = (raw || '').toLowerCase().trim();
  if (normalized === 'high' || normalized === '1' || normalized === 'critical') return 'high';
  if (normalized === 'moderate' || normalized === '2' || normalized === 'significant')
    return 'moderate';
  if (normalized === 'low' || normalized === '3' || normalized === 'minor') return 'low';
  return 'info';
}

/** Determine if a finding requires override before signing. */
export function requiresOverrideForCategory(
  category: OrderCheckCategory,
  severity: OrderCheckSeverity
): boolean {
  // High-severity drug-allergy and drug-drug ALWAYS require override
  if (severity === 'high') return true;
  if (category === 'drug-allergy' && severity === 'moderate') return true;
  if (category === 'drug-drug' && severity === 'moderate') return true;
  return false;
}
