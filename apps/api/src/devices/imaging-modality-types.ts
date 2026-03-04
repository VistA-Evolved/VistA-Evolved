/**
 * Imaging Modality Connectivity — Types
 *
 * Phase 386 (W21-P9): DICOM Modality Worklist (MWL), Modality Performed
 * Procedure Step (MPPS), and DICOMweb bridge types. Extends the existing
 * Orthanc imaging stack (Phase 22-24) with modality workflow tracking.
 */

// ---------------------------------------------------------------------------
// Modality Worklist (MWL)
// ---------------------------------------------------------------------------

/** A scheduled procedure step on the modality worklist */
export interface WorklistItem {
  /** Internal ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Accession number (links to VistA radiology order) */
  accessionNumber: string;
  /** Patient DFN */
  patientDfn: string;
  /** Patient name (DICOM PN format: Last^First^Middle) */
  patientName: string;
  /** Patient date of birth (YYYYMMDD) */
  patientDob?: string;
  /** Patient sex (M/F/O) */
  patientSex?: string;
  /** Requested procedure description */
  requestedProcedure: string;
  /** Requested procedure ID */
  requestedProcedureId?: string;
  /** Scheduled procedure step ID */
  scheduledStepId: string;
  /** Modality (CT, MR, US, XA, CR, DX, etc.) */
  modality: string;
  /** Scheduled AE Title (target modality) */
  scheduledAeTitle?: string;
  /** Scheduled date/time (YYYYMMDDHHMMSS) */
  scheduledDateTime: string;
  /** Scheduled performing physician */
  scheduledPhysician?: string;
  /** Referring physician */
  referringPhysician?: string;
  /** Study Instance UID (pre-assigned or generated) */
  studyInstanceUid: string;
  /** VistA radiology order IEN */
  vistaOrderIen?: string;
  /** Item status */
  status: WorklistItemStatus;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

export type WorklistItemStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'discontinued'
  | 'cancelled';

// ---------------------------------------------------------------------------
// MPPS — Modality Performed Procedure Step
// ---------------------------------------------------------------------------

export type MppsStatus = 'IN PROGRESS' | 'COMPLETED' | 'DISCONTINUED';

export interface MppsRecord {
  /** Internal ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** SOP Instance UID for MPPS */
  mppsInstanceUid: string;
  /** Linked worklist item ID */
  worklistItemId?: string;
  /** Accession number */
  accessionNumber?: string;
  /** Study Instance UID */
  studyInstanceUid: string;
  /** Performing AE Title */
  performingAeTitle: string;
  /** MPPS status */
  status: MppsStatus;
  /** Modality */
  modality: string;
  /** Procedure description */
  procedureDescription?: string;
  /** Start date/time (YYYYMMDDHHMMSS) */
  startDateTime: string;
  /** End date/time (YYYYMMDDHHMMSS) — set on COMPLETED */
  endDateTime?: string;
  /** Number of series in study */
  seriesCount?: number;
  /** Number of instances in study */
  instanceCount?: number;
  /** Performing physician */
  performingPhysician?: string;
  /** Dose report (for CT/XA) */
  doseReport?: DoseReport;
  /** Received timestamp */
  receivedAt: string;
  /** Last updated */
  updatedAt: string;
}

/** Radiation dose information from MPPS */
export interface DoseReport {
  /** Total DLP (dose-length product) in mGy·cm */
  totalDlp?: number;
  /** CTDIvol in mGy */
  ctdiVol?: number;
  /** DAP (dose-area product) in dGy·cm² */
  dap?: number;
  /** Fluoroscopy time in seconds */
  fluoroTime?: number;
  /** Number of exposures */
  exposureCount?: number;
}

// ---------------------------------------------------------------------------
// DICOM Modality AE Title Registration (extends Phase 24 device registry)
// ---------------------------------------------------------------------------

export interface ModalityAeConfig {
  /** Internal ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** AE Title (uppercase, 1-16 chars) */
  aeTitle: string;
  /** Modality type (CT, MR, US, etc.) */
  modality: string;
  /** IP address or hostname */
  host: string;
  /** DICOM port */
  port: number;
  /** Display name */
  displayName?: string;
  /** Location/room */
  location?: string;
  /** MWL query enabled */
  mwlEnabled: boolean;
  /** MPPS enabled */
  mppsEnabled: boolean;
  /** Last known status */
  status: 'active' | 'offline' | 'maintenance' | 'decommissioned';
  /** Last successful C-ECHO timestamp */
  lastEcho?: string;
  /** Created at */
  createdAt: string;
  /** Updated at */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface ImagingModalityStats {
  totalWorklistItems: number;
  totalMppsRecords: number;
  totalModalities: number;
  byModality: Record<string, number>;
  byStatus: Record<string, number>;
  mppsCompletionRate: number;
}
