/**
 * apps/api/src/service-lines/ed/types.ts
 *
 * Phase 464 (W31-P1). Emergency Department domain types.
 * Covers the full ED workflow: arrival -> triage -> bed -> treatment -> disposition.
 */

// ── Triage ─────────────────────────────────────────────────────────

/** ESI (Emergency Severity Index) 1-5 */
export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface TriageAssessment {
  level: TriageLevel;
  chiefComplaint: string;
  acuityCategory: 'resuscitation' | 'emergent' | 'urgent' | 'less-urgent' | 'non-urgent';
  vitalSigns?: {
    hr?: number;
    bp?: string;
    rr?: number;
    temp?: number;
    spo2?: number;
    painScale?: number;
  };
  triageNurse: string;
  triageTime: string;
  notes?: string;
}

// ── Bed Management ─────────────────────────────────────────────────

export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'blocked' | 'reserved';

export interface EdBed {
  id: string;
  zone: string; // e.g., "trauma", "acute", "fast-track", "hallway"
  bedNumber: string;
  status: BedStatus;
  currentVisitId?: string;
  lastCleanedAt?: string;
}

export interface BedAssignment {
  bedId: string;
  visitId: string;
  assignedAt: string;
  assignedBy: string;
  releasedAt?: string;
}

// ── ED Visit ───────────────────────────────────────────────────────

export type EdVisitStatus =
  | 'waiting' // In waiting room
  | 'triaged' // Triage complete
  | 'bedded' // Assigned to bed
  | 'in-treatment' // Physician evaluation/treatment
  | 'pending-results' // Awaiting lab/imaging
  | 'pending-consult' // Awaiting specialist consult
  | 'pending-disposition' // Treatment done, awaiting decision
  | 'admitted' // Decision to admit
  | 'discharged' // Released home
  | 'transferred' // Transferred to another facility
  | 'left-ama' // Left against medical advice
  | 'lwbs' // Left without being seen
  | 'expired'; // Patient expired

export type EdDisposition =
  | 'admit-floor'
  | 'admit-icu'
  | 'admit-telemetry'
  | 'admit-obs'
  | 'discharge-home'
  | 'transfer-out'
  | 'left-ama'
  | 'lwbs'
  | 'expired';

export interface EdVisit {
  id: string;
  patientDfn: string;
  status: EdVisitStatus;
  arrivalTime: string;
  arrivalMode: 'ambulance' | 'walk-in' | 'police' | 'helicopter' | 'transfer';
  triage?: TriageAssessment;
  bedAssignment?: BedAssignment;
  attendingProvider?: string;
  disposition?: EdDisposition;
  dispositionTime?: string;
  dispositionBy?: string;
  admitOrderIen?: string;
  createdBy?: string;
  totalMinutes?: number;
  doorToProviderMinutes?: number;
  doorToDispositionMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Board Metrics ──────────────────────────────────────────────────

export interface EdBoardMetrics {
  totalVisits: number;
  waitingCount: number;
  beddedCount: number;
  pendingAdmitCount: number;
  avgWaitMinutes: number;
  avgLosMinutes: number; // Length of stay
  lwbsRate: number; // Left without being seen percentage
  bedOccupancyPct: number;
  byAcuity: Record<string, number>;
}
