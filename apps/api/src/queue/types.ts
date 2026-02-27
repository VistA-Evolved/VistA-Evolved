/**
 * Phase 159: Patient Queue / Waiting / Numbering / Calling System — Types
 */

/** Priority levels for queue tickets */
export type QueuePriority = "urgent" | "high" | "normal" | "low";

/** Ticket lifecycle states */
export type TicketStatus =
  | "waiting"    // Patient checked in, waiting to be called
  | "called"     // Called to window/room
  | "serving"    // Currently being served
  | "completed"  // Visit complete
  | "no-show"    // Did not respond when called
  | "transferred"; // Moved to another department queue

/** Standard department identifiers */
export const DEPARTMENT_IDS = [
  "ed",
  "primary-care",
  "laboratory",
  "radiology",
  "pharmacy",
  "dental",
  "mental-health",
  "ophthalmology",
  "physical-therapy",
  "surgery-clinic",
  "ob-gyn",
  "pediatrics",
  "cardiology",
  "specialty-clinic",
  "registration",
  "billing",
] as const;

export type DepartmentId = (typeof DEPARTMENT_IDS)[number] | string;

/** A single queue ticket */
export interface QueueTicket {
  id: string;
  tenantId: string;
  department: string;
  ticketNumber: string;       // e.g., "ED-001", "LAB-042"
  patientDfn: string;
  patientName: string;        // Display name for calling board
  priority: QueuePriority;
  status: TicketStatus;
  providerDuz?: string;       // Assigned provider
  windowNumber?: string;      // Window/room number
  notes?: string;             // Internal notes (not displayed publicly)
  appointmentIen?: string;    // Link to scheduling appointment
  createdAt: string;          // ISO timestamp
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  transferredFrom?: string;   // Source department if transferred
}

/** Queue event for audit trail */
export interface QueueEvent {
  id: string;
  tenantId: string;
  ticketId: string;
  eventType: string;          // "created" | "called" | "serving" | "completed" | "no-show" | "transferred" | "priority-changed"
  actorDuz?: string;
  detail?: string;
  createdAt: string;
}

/** Department queue configuration */
export interface DepartmentQueueConfig {
  id: string;
  tenantId: string;
  department: string;
  displayName: string;
  prefix: string;            // Ticket prefix, e.g., "ED", "LAB"
  maxActive: number;         // Max concurrent tickets
  autoCallEnabled: boolean;  // Auto-call next on complete
  estimatedServiceMinutes: number;
  windows: string[];         // Available windows/rooms
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Queue display board data — no auth, public-safe */
export interface QueueDisplayBoard {
  department: string;
  displayName: string;
  currentlyServing: Array<{
    ticketNumber: string;
    windowNumber: string;
  }>;
  nowCalling: Array<{
    ticketNumber: string;
    windowNumber: string;
  }>;
  waitingCount: number;
  estimatedWaitMinutes: number;
  updatedAt: string;
}

/** Queue statistics */
export interface QueueStats {
  department: string;
  totalToday: number;
  waiting: number;
  serving: number;
  completed: number;
  noShow: number;
  averageWaitMinutes: number;
  averageServiceMinutes: number;
  byPriority: Record<QueuePriority, number>;
}

/** Create ticket input */
export interface CreateTicketInput {
  department: string;
  patientDfn: string;
  patientName: string;
  priority?: QueuePriority;
  appointmentIen?: string;
  notes?: string;
}

/** Transfer ticket input */
export interface TransferTicketInput {
  targetDepartment: string;
  reason?: string;
}
