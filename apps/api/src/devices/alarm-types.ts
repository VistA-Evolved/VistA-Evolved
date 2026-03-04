/**
 * Device Alarms Pipeline — Types
 *
 * Phase 384 (W21-P7): IHE PCD ACM (Alarm Communication Management)
 * alarm types, severity levels, escalation rules, and acknowledgment.
 *
 * Reference: IHE Patient Care Device Technical Framework, ACM Profile
 */

// ---------------------------------------------------------------------------
// Alarm Severity (IHE PCD / IEEE 11073)
// ---------------------------------------------------------------------------

/** IHE PCD alarm priority mapping to IEEE 11073 alert priorities */
export type AlarmPriority = 'low' | 'medium' | 'high' | 'crisis';

/** Alarm condition state */
export type AlarmState = 'active' | 'latched' | 'acknowledged' | 'resolved' | 'escalated';

/** Source protocol that generated the alarm */
export type AlarmSource = 'hl7v2' | 'astm' | 'poct1a' | 'sdc' | 'manual' | 'rule-engine';

// ---------------------------------------------------------------------------
// Core Alarm Types
// ---------------------------------------------------------------------------

export interface DeviceAlarm {
  /** Unique alarm identifier */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Source device serial number */
  deviceSerial: string;
  /** Source gateway ID (if from gateway) */
  gatewayId?: string;
  /** Alarm code (MDC, LOINC, or device-specific) */
  code: string;
  /** Coding system for the alarm code */
  codingSystem: string;
  /** Human-readable alarm description */
  displayText: string;
  /** Alarm priority */
  priority: AlarmPriority;
  /** Current alarm state */
  state: AlarmState;
  /** Source protocol */
  source: AlarmSource;
  /** Associated patient ID (if known) */
  patientId?: string;
  /** Associated location */
  location?: string;
  /** Triggering observation value */
  triggerValue?: string;
  /** Triggering observation unit */
  triggerUnit?: string;
  /** Threshold that was exceeded */
  threshold?: string;
  /** When the alarm condition started */
  activatedAt: string;
  /** When the alarm was last updated */
  updatedAt: string;
  /** When the alarm was acknowledged (if acked) */
  acknowledgedAt?: string;
  /** Who acknowledged the alarm */
  acknowledgedBy?: string;
  /** When the alarm resolved */
  resolvedAt?: string;
  /** Escalation target (user/role/team) */
  escalationTarget?: string;
  /** Number of escalation steps taken */
  escalationLevel: number;
  /** Metadata from the source observation */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Alarm Routing Rule
// ---------------------------------------------------------------------------

export interface AlarmRoutingRule {
  /** Rule ID */
  id: string;
  /** Rule display name */
  name: string;
  /** Match criteria: alarm code pattern (regex) */
  codePattern?: string;
  /** Match criteria: minimum priority */
  minPriority?: AlarmPriority;
  /** Match criteria: device serial pattern (regex) */
  devicePattern?: string;
  /** Match criteria: location pattern */
  locationPattern?: string;
  /** Action: notification targets */
  notifyTargets: string[];
  /** Action: auto-escalate after N seconds */
  autoEscalateAfterSec?: number;
  /** Action: escalation chain (ordered targets) */
  escalationChain?: string[];
  /** Whether the rule is enabled */
  enabled: boolean;
  /** Rule priority (lower = evaluated first) */
  rulePriority: number;
  /** Created timestamp */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Alarm Acknowledgment
// ---------------------------------------------------------------------------

export interface AlarmAcknowledgment {
  /** Ack ID */
  id: string;
  /** Alarm ID being acknowledged */
  alarmId: string;
  /** Who acknowledged */
  userId: string;
  /** Ack reason/comment */
  reason?: string;
  /** Whether the ack silences further escalation */
  silencesEscalation: boolean;
  /** Timestamp */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Alarm Statistics
// ---------------------------------------------------------------------------

export interface AlarmStats {
  totalActive: number;
  totalLatched: number;
  totalAcknowledged: number;
  totalResolved: number;
  totalEscalated: number;
  byPriority: Record<AlarmPriority, number>;
  bySource: Record<string, number>;
  oldestActiveAt?: string;
}
