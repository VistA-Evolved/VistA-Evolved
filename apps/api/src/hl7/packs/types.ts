/**
 * HL7v2 Message Packs — Shared Types
 *
 * Phase 241 (Wave 6 P4): Common types for message pack modules.
 */

import type { Hl7Message } from '../types.js';
import type { Hl7Route } from '../routing/types.js';

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/** Severity of a validation issue */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** A single validation issue */
export interface ValidationIssue {
  /** Severity */
  severity: ValidationSeverity;
  /** Segment responsible (e.g., "PID", "ORC") */
  segment?: string;
  /** Field position (HL7 1-based notation, e.g., "PID-3") */
  field?: string;
  /** Human-readable message */
  message: string;
  /** Rule code for programmatic matching */
  ruleCode: string;
}

/** Validation result for a message */
export interface ValidationResult {
  /** Whether the message is valid (no errors, warnings OK) */
  valid: boolean;
  /** All issues found */
  issues: ValidationIssue[];
  /** Summary counts */
  errorCount: number;
  warningCount: number;
}

/* ------------------------------------------------------------------ */
/*  Message Building                                                   */
/* ------------------------------------------------------------------ */

/** Common patient demographics for message building */
export interface PatientDemographics {
  /** Patient ID / MRN */
  patientId: string;
  /** Patient ID assigning authority */
  assigningAuthority?: string;
  /** Last name */
  lastName: string;
  /** First name */
  firstName: string;
  /** Date of birth — YYYYMMDD */
  dob?: string;
  /** Administrative sex (M/F/U/O) */
  sex?: string;
  /** SSN (will be masked in logs) */
  ssn?: string;
}

/** Common visit/encounter info */
export interface VisitInfo {
  /** Visit number / encounter ID */
  visitNumber: string;
  /** Patient class (I=Inpatient, O=Outpatient, E=Emergency) */
  patientClass: string;
  /** Assigned location (ward/clinic) */
  assignedLocation?: string;
  /** Attending doctor ID */
  attendingDoctorId?: string;
  /** Attending doctor name */
  attendingDoctorName?: string;
  /** Admit date/time — YYYYMMDDHHMMSS */
  admitDateTime?: string;
}

/* ------------------------------------------------------------------ */
/*  Message Pack Interface                                             */
/* ------------------------------------------------------------------ */

/** A message pack provides builders, validators, and route templates for a family of HL7v2 messages. */
export interface MessagePack {
  /** Pack identifier (e.g., "adt", "orm") */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** HL7v2 message types handled by this pack */
  readonly messageTypes: string[];
  /** Description */
  readonly description: string;
  /** Validate an inbound message */
  validate(message: Hl7Message): ValidationResult;
  /** Get a default route template for this pack */
  getRouteTemplate(): Partial<Hl7Route>;
}
