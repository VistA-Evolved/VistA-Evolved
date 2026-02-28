/**
 * Telehealth Consent Posture — Phase 307 (W12-P9)
 *
 * Tracks consent state for telehealth sessions. Every telehealth visit
 * requires documented consent before the video session can proceed.
 *
 * Consent categories:
 *   - telehealth_video: Consent to participate via video (required)
 *   - telehealth_recording: Consent to session recording (optional, OFF by default)
 *   - telehealth_data_sharing: Consent to share data with remote provider (optional)
 *
 * Design:
 *   - Consent is room-scoped (one consent record per room per participant)
 *   - Provider consent is implicit (they initiate the visit)
 *   - Patient consent must be explicitly recorded before joining
 *   - All consent events are audited via immutable audit trail
 *   - No PHI in consent records (hashed participant ID)
 *
 * VistA grounding (future):
 *   - File #9000010.05 (V CONSENT): PCE consent record
 *   - TIU CREATE RECORD: Document consent as a TIU note (progress note)
 *   - ORWPT LEGACY: Patient consent documentation RPC (if available)
 */

import { createHash } from "node:crypto";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ConsentCategory =
  | "telehealth_video"
  | "telehealth_recording"
  | "telehealth_data_sharing";

export type ConsentDecision = "granted" | "denied" | "withdrawn" | "pending";

export interface ConsentRecord {
  /** Unique consent ID */
  id: string;
  /** Room ID this consent is for */
  roomId: string;
  /** SHA-256 hash of participant identity (no PHI) */
  participantHash: string;
  /** Participant role (patient, provider, etc.) */
  participantRole: "patient" | "provider" | "interpreter" | "caregiver";
  /** Consent category */
  category: ConsentCategory;
  /** Current decision */
  decision: ConsentDecision;
  /** ISO timestamp of decision */
  decidedAt: string;
  /** ISO timestamp of most recent change */
  updatedAt: string;
  /** How consent was captured */
  captureMethod: "ui_click" | "verbal_confirmed" | "pre_registered" | "implicit";
  /** Version of consent text shown (for audit trail) */
  consentTextVersion?: string;
}

export interface ConsentPosture {
  /** Room ID */
  roomId: string;
  /** Is the room ready for video (all required consents granted)? */
  videoReady: boolean;
  /** Is recording allowed? */
  recordingAllowed: boolean;
  /** Missing required consents */
  missingConsents: { participantRole: string; category: ConsentCategory }[];
  /** All consent records for this room */
  consents: ConsentRecord[];
}

/* Configuration: which consents are required vs optional */
export interface ConsentRequirement {
  category: ConsentCategory;
  required: boolean;
  /** Roles that must provide this consent */
  requiredRoles: string[];
  /** Default decision for implicit consent */
  defaultDecision?: ConsentDecision;
}

/** Default consent requirements */
export const DEFAULT_CONSENT_REQUIREMENTS: ConsentRequirement[] = [
  {
    category: "telehealth_video",
    required: true,
    requiredRoles: ["patient"],
    // Provider consent is implicit (they initiate the visit)
  },
  {
    category: "telehealth_recording",
    required: false,
    requiredRoles: ["patient", "provider"],
    defaultDecision: "denied", // Recording OFF by default (see AGENTS.md #59)
  },
  {
    category: "telehealth_data_sharing",
    required: false,
    requiredRoles: ["patient"],
    defaultDecision: "pending",
  },
];

/* ------------------------------------------------------------------ */
/* Store (in-memory, resets on restart)                                 */
/* ------------------------------------------------------------------ */

/** Map<roomId, ConsentRecord[]> */
const consentStore = new Map<string, ConsentRecord[]>();
const MAX_ROOMS_TRACKED = 2000;
let consentIdCounter = 0;

/**
 * Hash a participant identity for non-PHI storage.
 */
export function hashParticipant(identity: string): string {
  return createHash("sha256").update(`consent:${identity}`).digest("hex").slice(0, 16);
}

/**
 * Record a consent decision for a participant in a room.
 * Idempotent: updates existing record if same room+participant+category.
 */
export function recordConsent(
  roomId: string,
  participantHash: string,
  participantRole: ConsentRecord["participantRole"],
  category: ConsentCategory,
  decision: ConsentDecision,
  captureMethod: ConsentRecord["captureMethod"] = "ui_click",
  consentTextVersion?: string,
): ConsentRecord {
  // Enforce capacity
  if (!consentStore.has(roomId) && consentStore.size >= MAX_ROOMS_TRACKED) {
    const oldest = consentStore.keys().next().value;
    if (oldest) consentStore.delete(oldest);
  }

  const records = consentStore.get(roomId) || [];
  const now = new Date().toISOString();

  // Check for existing record (idempotent update)
  const existing = records.find(
    (r) =>
      r.participantHash === participantHash &&
      r.category === category,
  );

  if (existing) {
    existing.decision = decision;
    existing.updatedAt = now;
    existing.decidedAt = now;
    existing.captureMethod = captureMethod;
    if (consentTextVersion) existing.consentTextVersion = consentTextVersion;
    log.info(`Consent updated: room=${roomId} category=${category} decision=${decision}`);
    return existing;
  }

  // New record
  consentIdCounter++;
  const record: ConsentRecord = {
    id: `csnt-${consentIdCounter}`,
    roomId,
    participantHash,
    participantRole,
    category,
    decision,
    decidedAt: now,
    updatedAt: now,
    captureMethod,
    consentTextVersion,
  };

  records.push(record);
  consentStore.set(roomId, records);

  log.info(`Consent recorded: room=${roomId} category=${category} decision=${decision} role=${participantRole}`);
  return record;
}

/**
 * Evaluate the consent posture for a room.
 * Returns whether the room is ready for video based on consent requirements.
 */
export function evaluateConsentPosture(
  roomId: string,
  requirements: ConsentRequirement[] = DEFAULT_CONSENT_REQUIREMENTS,
): ConsentPosture {
  const records = consentStore.get(roomId) || [];
  const missingConsents: ConsentPosture["missingConsents"] = [];

  for (const req of requirements) {
    if (!req.required) continue;

    for (const role of req.requiredRoles) {
      const consent = records.find(
        (r) =>
          r.participantRole === role &&
          r.category === req.category &&
          r.decision === "granted",
      );
      if (!consent) {
        missingConsents.push({ participantRole: role, category: req.category });
      }
    }
  }

  // Recording is allowed only if ALL participants granted recording consent
  const recordingConsents = records.filter(
    (r) => r.category === "telehealth_recording",
  );
  const recordingAllowed =
    recordingConsents.length > 0 &&
    recordingConsents.every((r) => r.decision === "granted");

  return {
    roomId,
    videoReady: missingConsents.length === 0,
    recordingAllowed,
    missingConsents,
    consents: records,
  };
}

/**
 * Get all consent records for a room.
 */
export function getConsentRecords(roomId: string): ConsentRecord[] {
  return consentStore.get(roomId) || [];
}

/**
 * Withdraw a specific consent.
 */
export function withdrawConsent(
  roomId: string,
  participantHash: string,
  category: ConsentCategory,
): ConsentRecord | undefined {
  const records = consentStore.get(roomId) || [];
  const record = records.find(
    (r) => r.participantHash === participantHash && r.category === category,
  );

  if (record) {
    record.decision = "withdrawn";
    record.updatedAt = new Date().toISOString();
    log.info(`Consent withdrawn: room=${roomId} category=${category}`);
  }
  return record;
}

/**
 * Get consent store stats.
 */
export function getConsentStats(): {
  trackedRooms: number;
  totalRecords: number;
  byDecision: Record<ConsentDecision, number>;
} {
  const byDecision: Record<ConsentDecision, number> = {
    granted: 0,
    denied: 0,
    withdrawn: 0,
    pending: 0,
  };
  let totalRecords = 0;

  for (const records of consentStore.values()) {
    totalRecords += records.length;
    for (const r of records) {
      byDecision[r.decision]++;
    }
  }

  return { trackedRooms: consentStore.size, totalRecords, byDecision };
}

/**
 * Clear all consent records (for testing).
 */
export function clearConsentStore(): void {
  consentStore.clear();
  consentIdCounter = 0;
}
