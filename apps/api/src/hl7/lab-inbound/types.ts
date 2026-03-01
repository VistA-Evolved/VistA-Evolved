/**
 * Lab Result Inbound Types — Phase 433 (W27 P3)
 *
 * Types for the HL7v2 ORU^R01 lab result inbound path.
 * Bridges the existing HL7 engine's ObservationResult type
 * to VistA-Evolved's LabResult adapter type with additional
 * inbound-specific metadata (specimen, accession, filing status).
 */

/* ------------------------------------------------------------------ */
/* Specimen Information (OBR-15 / SPM segment)                         */
/* ------------------------------------------------------------------ */

export interface SpecimenInfo {
  /** Specimen type (e.g., "BLOOD", "URINE", "CSF") */
  type: string;
  /** Specimen source body site */
  source?: string;
  /** Collection date/time (ISO 8601) */
  collectionDateTime?: string;
  /** Received date/time at lab (ISO 8601) */
  receivedDateTime?: string;
  /** Collector name or ID */
  collector?: string;
  /** Specimen accession number */
  accessionNumber?: string;
}

/* ------------------------------------------------------------------ */
/* Inbound Lab Result (staged before VistA filing)                     */
/* ------------------------------------------------------------------ */

export type LabFilingStatus =
  | "received"       // ORU^R01 parsed and staged
  | "validated"      // Passed validation checks
  | "filed"          // Filed to VistA (future — requires LR package RPCs)
  | "file-failed"    // Filing to VistA failed
  | "quarantined"    // Validation failed / unmatched patient
  | "acknowledged";  // ORWLRR ACK called (clinician saw it)

export interface InboundLabResult {
  /** Internal ID (UUID-like) */
  id: string;
  /** HL7 message control ID for tracing */
  messageControlId: string;
  /** Sending application (MSH-3) */
  sendingApp: string;
  /** Sending facility (MSH-4) */
  sendingFacility: string;
  /** Receiving facility (MSH-6) */
  receivingFacility?: string;
  /** Message timestamp (MSH-7, ISO 8601) */
  messageTimestamp: string;

  /* Patient matching */
  /** Patient external ID (PID-3) */
  patientExternalId: string;
  /** Patient name from HL7 (not stored in VistA-Evolved — for matching only) */
  patientNameHash?: string;    // SHA-256 hash, not plaintext
  /** Matched VistA DFN (null if unmatched) */
  matchedDfn?: string;

  /* Order identification */
  /** Placer order number (OBR-2) — maps to VistA order IEN */
  placerOrderNumber?: string;
  /** Filler order number (OBR-3) — lab-assigned */
  fillerOrderNumber: string;
  /** Universal service identifier (OBR-4) — LOINC or local code */
  universalServiceId: string;
  /** Accession number (OBR-20) */
  accessionNumber?: string;

  /* Specimen */
  specimen?: SpecimenInfo;

  /* Results */
  results: InboundObservation[];

  /* Status tracking */
  status: LabFilingStatus;
  receivedAt: string;          // ISO 8601 — when we received it
  validatedAt?: string;
  filedAt?: string;
  filingError?: string;
  vistaLabIen?: string;        // IEN in File 63 after filing (future)

  /* Metadata */
  resultStatus: "F" | "P" | "C" | "X";  // Final / Preliminary / Corrected / Cancelled
  priority?: "S" | "R" | "A";           // Stat / Routine / ASAP
}

/** Individual observation within an inbound lab result. */
export interface InboundObservation {
  /** Sequence (1-based) */
  setId: number;
  /** Observation identifier (OBX-3) — LOINC code^description^system */
  observationId: string;
  /** Value type (NM=Numeric, ST=String, CE=Coded, TX=Text) */
  valueType: string;
  /** Observation value (OBX-5) */
  value: string;
  /** Units (OBX-6) */
  units?: string;
  /** Reference range (OBX-7) */
  referenceRange?: string;
  /** Abnormal flag (OBX-8): H, L, HH, LL, A, N, etc. */
  abnormalFlag?: string;
  /** Result status (OBX-11): F=Final, P=Preliminary, C=Corrected */
  resultStatus: string;
  /** Observation date/time (OBX-14, ISO 8601) */
  observationDateTime?: string;
}

/* ------------------------------------------------------------------ */
/* Inbound Lab Validation                                              */
/* ------------------------------------------------------------------ */

export interface LabValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* Lab Filing Target (VistA integration-pending metadata)               */
/* ------------------------------------------------------------------ */

export interface LabFilingTarget {
  /** Target VistA file for result storage */
  vistaFile: string;          // "63" (LAB DATA) or "63.04" (CH subscript)
  /** Target routine/RPC for filing */
  targetRpc: string;          // "LRFZX" or custom ZVE routine
  /** Package */
  vistaPackage: string;       // "LR"
  /** Sandbox availability */
  sandboxNote: string;
  /** Migration path */
  migrationPath: string;
}
