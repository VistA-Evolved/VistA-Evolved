/**
 * apps/api/src/service-lines/or/types.ts
 *
 * Phase 466 (W31-P3). Operating Room & Anesthesia domain types.
 * Covers case scheduling, room management, anesthesia tracking.
 */

// ── OR Room ────────────────────────────────────────────────────────

export type OrRoomStatus = "available" | "in-use" | "turnover" | "blocked" | "maintenance";

export interface OrRoom {
  id: string;
  name: string;
  location: string;   // e.g., "Main OR", "Ambulatory Surgery"
  status: OrRoomStatus;
  currentCaseId?: string;
  capabilities: string[];  // e.g., ["general", "cardiac", "neuro", "robotic"]
}

export interface OrBlock {
  id: string;
  roomId: string;
  serviceId: string;   // surgical service that owns the block
  dayOfWeek: number;   // 0=Sun, 6=Sat
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  surgeon?: string;
}

// ── OR Case ────────────────────────────────────────────────────────

export type OrCaseStatus =
  | "scheduled"
  | "pre-op"
  | "in-holding"
  | "in-or"
  | "under-anesthesia"
  | "procedure-start"
  | "procedure-end"
  | "closing"
  | "in-pacu"
  | "recovered"
  | "completed"
  | "cancelled";

export type CasePriority = "elective" | "urgent" | "emergent" | "add-on";

export interface OrCase {
  id: string;
  patientDfn: string;
  status: OrCaseStatus;
  priority: CasePriority;
  roomId?: string;
  scheduledDate: string;
  scheduledStartTime?: string;
  estimatedDurationMin: number;
  surgeon: string;
  assistants: string[];
  procedure: string;
  procedureCpt?: string;
  laterality?: "left" | "right" | "bilateral" | "na";
  anesthesia?: AnesthesiaRecord;
  milestones: OrMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface OrMilestone {
  event: string;
  timestamp: string;
  recordedBy: string;
}

// ── Anesthesia ─────────────────────────────────────────────────────

export type AnesthesiaType = "general" | "regional" | "local" | "mac" | "spinal" | "epidural" | "combined";

export interface AnesthesiaRecord {
  type: AnesthesiaType;
  anesthesiologist: string;
  crna?: string;
  asaClass: 1 | 2 | 3 | 4 | 5 | 6;
  preOpEvalComplete: boolean;
  inductionTime?: string;
  intubationTime?: string;
  emergenceTime?: string;
  extubationTime?: string;
  agents: string[];           // e.g., ["propofol", "sevoflurane", "fentanyl"]
  airway?: "ett" | "lma" | "mask" | "native";
  complications: string[];
}

// ── Board Metrics ──────────────────────────────────────────────────

export interface OrBoardMetrics {
  totalCasesToday: number;
  completedCases: number;
  inProgressCases: number;
  scheduledRemaining: number;
  cancelledCases: number;
  avgTurnoverMin: number;
  roomUtilizationPct: number;
  onTimeStartPct: number;
  byRoom: Record<string, { currentCase?: string; nextCase?: string; status: OrRoomStatus }>;
}
